/**
 * RealtimeOrchestrator — coordinates 3 near-realtime change feeds:
 *   1. Radarr SignalR (WebSocket/long-polling) → triggers on grab/import
 *   2. Sonarr SignalR (WebSocket/long-polling)  → triggers on grab/import
 *   3. qBittorrent sync/maindata (2s delta poll)  → triggers on torrent change
 *
 * On every trigger, it debounces a full recompute (progress-detector state machine)
 * to avoid flooding events.
 *
 * Reuses progress-detector.ts / media-progress-poller.ts logic — only the
 * "who triggers the recompute" changes.
 */

import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { QBittorrentCache } from '@/lib/services/qbittorrent-cache'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { ConfigStore } from '../config/config-store'
import { notificationBus } from '../event-bus'
import { NOTIFICATION_EVENTS } from '../types'
import type { MediaInfo, RequesterInfo, DownloadContext, NotificationEvent } from '../types'
import { detectProgress, transitions, type ProgressSnapshot, type ProgressState } from '../pollers/progress-detector'
import { QueuePoller } from './queue-poller'

const STATES_KEY = 'notifications_v2_progress_states'
const DEBOUNCE_MS = 1_500
const EMIT_COOLDOWN_MS = 30_000
const POLL_INTERVAL_MS = 30_000 // Fallback poll when SignalR/qBittorrent don't trigger

// SQLite can throw P1008 under concurrent load. Retry with exponential backoff.
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isTimeout = (err as { code?: string }).code === 'P1008'
      if (!isTimeout || i === maxRetries - 1) throw err
      const delay = 500 * (i + 1)
      console.warn(`[NotificationsV2][Realtime] ${label} timeout (retry ${i + 1}/${maxRetries}) waiting ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}

const EVENT_FOR_STATE: Record<ProgressState, NotificationEvent> = {
  grabbed: NOTIFICATION_EVENTS.MEDIA_GRABBED,
  downloading: NOTIFICATION_EVENTS.MEDIA_DOWNLOADING,
  completed: NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE,
  importing: NOTIFICATION_EVENTS.MEDIA_IMPORTING,
}

type StateMap = Record<string, ProgressState>

export class RealtimeOrchestrator {
  private radarrPoller: QueuePoller | null = null
  private sonarrPoller: QueuePoller | null = null
  private qbitCacheListener: (() => void) | null = null
  private debounceTimer: NodeJS.Timeout | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private isFirstRecompute = true
  private started = false
  /** In-memory dedup: last emission timestamp for requestId+state. */
  private lastEmittedAt = new Map<string, number>()
  /** Serialise recomputes so two parallel runs don't read stale DB state. */
  private recomputePromise: Promise<void> | null = null

  async start(): Promise<void> {
    if (this.started) return
    this.started = true

    const config = await ConfigStore.load()
    if (!config.enabled) {
      console.log('[NotificationsV2][Realtime] Module disabled — not starting feeds')
      return
    }

    // Radarr queue polling (replaces SignalR to avoid ws bundling issues)
    this.radarrPoller = new QueuePoller('radarr', () => this.scheduleRecompute(), 10_000)
    this.radarrPoller.start()

    // Sonarr queue polling
    this.sonarrPoller = new QueuePoller('sonarr', () => this.scheduleRecompute(), 10_000)
    this.sonarrPoller.start()

    // qBittorrent sync — listen to shared cache instead of duplicating polling
    this.qbitCacheListener = () => this.scheduleRecompute()
    QBittorrentCache.getInstance().addChangeListener(this.qbitCacheListener)

    // Fallback periodic poll — if SignalR doesn't connect or qBittorrent
    // doesn't report changes (e.g. Radarr removes torrent during import),
    // we still recompute every 30s to catch importing states.
    this.pollTimer = setInterval(() => {
      if (this.started) this.scheduleRecompute()
    }, POLL_INTERVAL_MS)

    // Seed initial state on startup so we don't spam on container restart.
    this.scheduleRecompute(true)

    console.log('[NotificationsV2][Realtime] Orchestrator started (poll fallback every 30s)')
  }

  stop(): void {
    this.started = false
    this.radarrPoller?.stop()
    this.sonarrPoller?.stop()
    if (this.qbitCacheListener) {
      QBittorrentCache.getInstance().removeChangeListener(this.qbitCacheListener)
      this.qbitCacheListener = null
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = null
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
  }


  private scheduleRecompute(isSeed = false): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      // Chain recomputes so DB state is always consistent.
      this.recomputePromise = (this.recomputePromise ?? Promise.resolve()).then(() =>
        this.recompute(isSeed).catch((err) =>
          console.error('[NotificationsV2][Realtime] Recompute error:', err)
        )
      )
    }, isSeed ? 0 : DEBOUNCE_MS)
  }

  private async recompute(seed: boolean): Promise<void> {
    const config = await withRetry(() => ConfigStore.load(), 'ConfigStore.load')
    if (!config.enabled) return

    const requests = await withRetry(
      () => prisma.mediaRequest.findMany({
        where: { status: { lt: 5 } },
        orderBy: { requestedAt: 'desc' },
        take: 200,
      }),
      'mediaRequest.findMany'
    )
    if (requests.length === 0) return

    const stored = await withRetry(() => loadStates(), 'loadStates')

    const [radarr, sonarr] = await Promise.all([
      getRadarrService(),
      getSonarrService(),
    ])

    const [radarrQueue, sonarrQueue] = await Promise.all([
      radarr ? radarr.getQueue() : Promise.resolve([]),
      sonarr ? sonarr.getQueue() : Promise.resolve([]),
    ])

    const torrents = QBittorrentCache.getInstance().getTorrents('all')

    const fresh = computeAllStates(
      requests,
      Array.isArray(radarrQueue) ? radarrQueue : [],
      Array.isArray(sonarrQueue) ? sonarrQueue : [],
      Array.isArray(torrents) ? torrents : []
    )

    // Startup seed: silently snapshot current states.
    if (seed || this.isFirstRecompute) {
      this.isFirstRecompute = false
      const seeded: StateMap = {}
      for (const [key, snap] of Object.entries(fresh)) seeded[key] = snap.state
      await saveStates(seeded)
      console.log(
        `[NotificationsV2][Realtime] Startup seed: ${Object.keys(seeded).length} request states silenced`
      )
      return
    }

    const merged: StateMap = { ...stored }
    let emittedCount = 0

    for (const req of requests) {
      const key = String(req.id)
      const snapshot = fresh[key]
      if (!snapshot) continue
      const prev = stored[key] ?? null
      const toEmit = transitions(prev, snapshot.state)
      if (toEmit.length === 0) continue

      for (const state of toEmit) {
        // In-memory dedup: same event for same request within cooldown is dropped.
        const dedupKey = `${key}:${state}`
        const lastAt = this.lastEmittedAt.get(dedupKey) ?? 0
        const now = Date.now()
        if (now - lastAt < EMIT_COOLDOWN_MS) {
          console.log(`[NotificationsV2][Realtime] Skipped duplicate ${state} for req #${key} (cooldown)`)
          continue
        }
        this.lastEmittedAt.set(dedupKey, now)
        await emitForRequest(req, snapshot, state)
        emittedCount++
      }
      merged[key] = snapshot.state
    }

    if (emittedCount > 0) {
      console.log(`[NotificationsV2][Realtime] Emitted ${emittedCount} progress event(s)`)
    }
    await withRetry(() => saveStates(merged), 'saveStates')
  }
}

// ── Pure helpers (mirrored from media-progress-poller) ──────────────────────

function computeAllStates(
  requests: Array<{ id: number; externalId: string | null; tmdbId: string; mediaType: string }>,
  radarrQueue: Array<import('@/lib/services/radarr').RadarrQueueItem>,
  sonarrQueue: Array<import('@/lib/services/sonarr').SonarrQueueItem>,
  torrents: Array<import('@/lib/services/qbittorrent').Torrent>
): Record<string, ProgressSnapshot> {
  const out: Record<string, ProgressSnapshot> = {}
  for (const req of requests) {
    const externalIdNum = req.externalId ? Number(req.externalId) : NaN
    const snapshot = detectProgress({
      tmdbId: req.tmdbId,
      mediaType: req.mediaType === 'tv' ? 'tv' : 'movie',
      radarrQueue,
      sonarrQueue,
      torrents,
      radarrMovieId: req.mediaType === 'movie' && Number.isFinite(externalIdNum) ? externalIdNum : undefined,
      sonarrSeriesId: req.mediaType === 'tv' && Number.isFinite(externalIdNum) ? externalIdNum : undefined,
    })
    if (snapshot) out[String(req.id)] = snapshot
  }
  return out
}

async function emitForRequest(
  req: { id: number; tmdbId: string; mediaType: string; title: string; metadata: string | null; userId: number | null },
  snapshot: ProgressSnapshot,
  state: ProgressState
): Promise<void> {
  let meta: Record<string, unknown> = {}
  try { meta = req.metadata ? JSON.parse(req.metadata) : {} } catch {}

  const media: MediaInfo = {
    tmdbId: req.tmdbId,
    mediaType: req.mediaType === 'tv' ? 'tv' : 'movie',
    title: req.title,
    year: (meta as { year?: string }).year,
    overview: (meta as { overview?: string }).overview,
    posterPath: (meta as { posterPath?: string }).posterPath,
    genres: (meta as { genres?: string }).genres,
  }

  let requester: RequesterInfo | undefined
  if (req.userId) {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (user) {
      requester = {
        id: user.id,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        whatsappNumber: (user as Record<string, unknown>).whatsappNumber as string | undefined,
      }
    }
  }

  const download: DownloadContext = {
    quality: snapshot.quality,
    size: snapshot.size,
    releaseName: snapshot.releaseName,
    progress: snapshot.progress,
  }

  await notificationBus.emit(EVENT_FOR_STATE[state], { media, requester, download })
}

async function loadStates(): Promise<StateMap> {
  const row = await prisma.setting.findFirst({ where: { key: STATES_KEY } })
  if (!row?.value) return {}
  try { return JSON.parse(row.value) as StateMap } catch { return {} }
}

async function saveStates(map: StateMap): Promise<void> {
  await prisma.setting.upsert({
    where: { key: STATES_KEY },
    update: { value: JSON.stringify(map) },
    create: { key: STATES_KEY, value: JSON.stringify(map) },
  })
}
