/**
 * QueuePoller — détecte les états intermédiaires de téléchargement via Radarr/Sonarr.
 *
 * Les webhooks Radarr/Sonarr ne fournissent pas:
 *   - MEDIA_DOWNLOADING (téléchargement en cours)
 *   - MEDIA_DOWNLOAD_COMPLETE (DL fini, en attente d'import)
 *   - MEDIA_IMPORTING (import en cours)
 *
 * Ce poller comble le gap en lisant `trackedDownloadState` toutes les 15s.
 *
 * Transitions détectées (forward-only) :
 *   undefined → downloading → download_complete → importing → (gone)
 *
 * État conservé en mémoire pour éviter le spam ; la dédup quotidienne en DB
 * sert de filet de sécurité supplémentaire.
 */

import { getRadarrService, type RadarrQueueItem } from '@/lib/services/radarr'
import { getSonarrService, type SonarrQueueItem } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'
import { db } from '@/lib/db/drizzle'
import { mediaRequests, notificationEvents } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { ConfigStore } from '../config/config-store'
import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS, type NotificationEvent, type MediaInfo, type RequesterInfo } from '../types'
import { getStuckImportDetector, type StuckItem } from './stuck-import-detector'

type TrackedState = 'downloading' | 'download_complete' | 'importing'

const STATE_ORDER: TrackedState[] = ['downloading', 'download_complete', 'importing']

const EVENT_FOR_STATE: Record<TrackedState, NotificationEvent> = {
  downloading: NOTIFICATION_EVENTS.MEDIA_DOWNLOADING,
  download_complete: NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE,
  importing: NOTIFICATION_EVENTS.MEDIA_IMPORTING,
}

/** Inverse de EVENT_FOR_STATE — pour reconstituer l'état depuis la DB */
const STATE_FOR_EVENT: Partial<Record<NotificationEvent, TrackedState>> = {
  [NOTIFICATION_EVENTS.MEDIA_DOWNLOADING]: 'downloading',
  [NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE]: 'download_complete',
  [NOTIFICATION_EVENTS.MEDIA_IMPORTING]: 'importing',
}

/**
 * Mappe un item de queue Radarr/Sonarr vers notre état canonique.
 *
 * Sémantique précise (basée sur status download-client + trackedDownloadState Sonarr) :
 *  - `downloading` : qBit en cours de téléchargement (status=downloading, sizeleft>0)
 *  - `download_complete` : qBit à 100% MAIS Sonarr n'a pas encore basculé en import
 *    (status=completed et trackedDownloadState=downloading/null, OU sizeleft=0)
 *  - `importing` : Sonarr en phase d'import du fichier (importPending / importBlocked / importing)
 *  - Item retiré de la queue : géré par le webhook → MEDIA_AVAILABLE
 *
 * Statuts terminaux ('completed' avec tDS='imported', 'failed', etc.) → null.
 */
interface QueueItemSignals {
  status?: string
  trackedDownloadState?: string
  sizeleft?: number
}

function mapTrackedState(item: QueueItemSignals): TrackedState | null {
  const status = item.status?.toLowerCase()
  const dlState = item.trackedDownloadState?.toLowerCase()
  const sizeleft = item.sizeleft ?? 1

  // Phase 3 : Sonarr/Radarr est passé en import
  if (dlState === 'importpending' || dlState === 'importblocked' || dlState === 'importing') {
    return 'importing'
  }

  // Phase 2 : qBit à 100% (release entièrement téléchargée) mais Sonarr pas encore en import
  if (status === 'completed' || sizeleft === 0) {
    return 'download_complete'
  }

  // Phase 1 : en cours de téléchargement
  if (status === 'downloading' || dlState === 'downloading') {
    return 'downloading'
  }

  // queued/paused/delay/failed/etc → rien à dispatcher
  return null
}

/** Contexte mémorisé pour le cleanup (cas où un item disparaît avant que tous les états aient été émis). */
interface CachedContext {
  media: MediaInfo
  requester?: RequesterInfo
  download: { quality?: string; size?: string; releaseName?: string }
}

export class QueuePoller {
  private started = false
  private isFirstRun = true
  private timer: NodeJS.Timeout | null = null

  /** Dernier état dispatché par clé (key = `radarr:<movieId>` ou `sonarr:<seriesId>:<season>`) */
  private readonly lastState = new Map<string, TrackedState>()
  /** Dernier contexte connu par clé — réutilisé au cleanup pour émettre les états manqués */
  private readonly lastContext = new Map<string, CachedContext>()
  /** Cache tvdbId → tmdbId pour éviter les appels TMDB répétés */
  private readonly tvdbToTmdb = new Map<number, string>()
  /** État max par (tmdbId:season) rechargé depuis la DB au démarrage */
  private readonly dbStateByMedia = new Map<string, TrackedState>()
  /** Détecteur d'imports bloqués pour backoff et gestion */
  private readonly stuckDetector = getStuckImportDetector()
  /** Intervalle dynamique basé sur la santé des APIs */
  private currentIntervalMs = 15_000

  constructor(private readonly baseIntervalMs = 15_000) {
    this.currentIntervalMs = baseIntervalMs
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.tick().catch(() => {})
    this.timer = setInterval(() => this.tick().catch(() => {}), this.currentIntervalMs)
    logger.info(`[NotifV2][QueuePoller] Started (every ${this.currentIntervalMs / 1000}s)`)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
    this.lastState.clear()
    this.lastContext.clear()
  }

  private async tick(): Promise<void> {
    const config = await ConfigStore.load()
    if (!config.enabled) {
      logger.debug('[NotifV2][QueuePoller] Tick skipped: V2 disabled')
      return
    }

    // Vérifier si on doit skipper ce tick (backoff)
    if (this.stuckDetector.shouldSkipTick()) {
      logger.debug('[NotifV2][QueuePoller] Tick skipped: backoff active')
      return
    }

    const tickStart = Date.now()
    let apiSuccess = true

    // Récupérer les services
    const servicesStart = Date.now()
    const [radarr, sonarr] = await Promise.all([getRadarrService(), getSonarrService()])
    
    // Récupérer les queues avec timing
    const queuePromise = Promise.all([
      radarr ? radarr.getQueue().catch((e) => {
        logger.error('[NotifV2][QueuePoller] Radarr queue fetch failed:', e)
        apiSuccess = false
        return [] as RadarrQueueItem[]
      }) : Promise.resolve([] as RadarrQueueItem[]),
      sonarr ? sonarr.getQueue().catch((e) => {
        logger.error('[NotifV2][QueuePoller] Sonarr queue fetch failed:', e)
        apiSuccess = false
        return [] as SonarrQueueItem[]
      }) : Promise.resolve([] as SonarrQueueItem[]),
    ])
    
    const [radarrQueue, sonarrQueue] = await queuePromise
    const apiDuration = Date.now() - servicesStart

    // Mettre à jour le détecteur d'imports bloqués
    this.stuckDetector.updateQueues(radarrQueue, sonarrQueue)
    this.stuckDetector.recordApiCall(apiDuration, apiSuccess)

    // Mettre à jour l'intervalle dynamique
    const newInterval = this.stuckDetector.getCurrentInterval()
    if (newInterval !== this.currentIntervalMs) {
      this.currentIntervalMs = newInterval
      // Redémarrer le timer avec le nouvel intervalle
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = setInterval(() => this.tick().catch(() => {}), this.currentIntervalMs)
      }
      logger.info(`[NotifV2][QueuePoller] Interval adjusted to ${this.currentIntervalMs / 1000}s (stuck: ${this.stuckDetector.getStats().stuckCount})`)
    }

    // Log des stats si des items bloqués détectés
    const stats = this.stuckDetector.getStats()
    if (stats.stuckCount > 0) {
      logger.warn(`[NotifV2][QueuePoller] Stuck imports: ${stats.stuckCount} (confirmed: ${stats.confirmedStuckCount})`)
    }

    if (sonarrQueue.length > 0) {
      logger.debug(`[NotifV2][QueuePoller] Sonarr queue: ${sonarrQueue.length} item(s)`)
    }

    // Filtrer les items bloqués confirmés pour réduire la charge
    const confirmedStuckIds = new Set(
      this.stuckDetector.getConfirmedStuckItems().map(item => `${item.type}:${item.id}`)
    )

    // Premier tick : on enregistre les états actuels SANS dispatcher (évite le spam au démarrage)
    if (this.isFirstRun) {
      this.isFirstRun = false

      // 1. Seed depuis la DB : les events dispatchés aujourd'hui pour ne pas régresser après redémarrage
      await this.seedLastStateFromDb()

      // 2. Seed depuis la queue courante (si état DB absent pour cet item)
      for (const item of radarrQueue) {
        const state = mapTrackedState(item)
        const key = this.radarrKey(item)
        if (state && !this.lastState.has(key)) this.lastState.set(key, state)
      }
      for (const item of sonarrQueue) {
        const state = mapTrackedState(item)
        const key = this.sonarrKey(item)
        if (state && !this.lastState.has(key)) this.lastState.set(key, state)
      }
      logger.info(
        `[NotifV2][QueuePoller] Startup seed: ${radarrQueue.length} Radarr + ${sonarrQueue.length} Sonarr items silenced (keys: ${Array.from(this.lastState.keys()).join(', ')})`
      )
      return
    }

    // Process Radarr items (skip confirmed stuck to reduce API load)
    for (const item of radarrQueue) {
      if (confirmedStuckIds.has(`radarr:${item.id}`)) {
        logger.debug(`[NotifV2][QueuePoller] Skipping confirmed stuck Radarr item: ${item.title}`)
        continue
      }
      try {
        await this.processRadarrItem(item)
      } catch (e) {
        logger.warn('[NotifV2][QueuePoller] Radarr item error:', e)
      }
    }

    // Filter out stuck Sonarr items before grouping
    const activeSonarrQueue = sonarrQueue.filter(item => !confirmedStuckIds.has(`sonarr:${item.id}`))
    
    // Process Sonarr items (groups par série+saison pour éviter le spam multi-pisodes)
    const sonarrBySeason = this.groupSonarrBySeason(activeSonarrQueue)
    if (sonarrBySeason.length > 0) {
      logger.info(
        `[NotifV2][QueuePoller] Sonarr groups: ${sonarrBySeason.map((g) => `${g.key}=${g.state}`).join(', ')} | lastState: ${Array.from(this.lastState.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}`
      )
    }
    for (const group of sonarrBySeason) {
      try {
        await this.processSonarrGroup(group)
      } catch (e) {
        logger.warn('[NotifV2][QueuePoller] Sonarr group error:', e)
      }
    }

    // Cleanup : pour chaque clé qui a disparu de la queue, émettre les états
    // manqués jusqu'à `importing` avant de retirer la clé. Indispensable car
    // Sonarr/Radarr peuvent passer de `importPending` (ou `downloading`) à
    // un item retiré de la queue sans jamais exposer l'état `importing`.
    const activeKeys = new Set<string>()
    for (const item of radarrQueue) activeKeys.add(this.radarrKey(item))
    for (const item of sonarrQueue) activeKeys.add(this.sonarrKey(item))
    for (const key of Array.from(this.lastState.keys())) {
      if (activeKeys.has(key)) continue
      await this.flushOnRemoval(key)
      this.lastState.delete(key)
      this.lastContext.delete(key)
    }

    // Log du temps total du tick
    const tickDuration = Date.now() - tickStart
    if (tickDuration > 5000) {
      logger.warn(`[NotifV2][QueuePoller] Slow tick: ${tickDuration}ms`)
    }
  }

  /**
   * Quand un item disparaît de la queue (= import terminé côté Sonarr/Radarr),
   * émet tous les états manqués jusqu'à `importing` inclus. Évite de perdre
   * MEDIA_IMPORTING quand le tracker ne passe pas par cet état visible.
   */
  private async flushOnRemoval(key: string): Promise<void> {
    const ctx = this.lastContext.get(key)
    if (!ctx) return
    const remaining = this.missedStates(key, 'importing')
    if (remaining.length === 0) return

    for (let i = 0; i < remaining.length; i++) {
      const state = remaining[i]
      if (i > 0) await new Promise((r) => setTimeout(r, 1200))
      const event = EVENT_FOR_STATE[state]
      const result = await dispatch(event, ctx)
      if (result.success) {
        this.lastState.set(key, state)
        if (!result.wasDuplicate) {
          logger.info(
            `[NotifV2][QueuePoller] ${event} dispatched on removal of ${key} → ${result.recipients.length} recipient(s)`
          )
        }
      } else {
        logger.warn(`[NotifV2][QueuePoller] ${event} dispatch FAILED on removal of ${key}: ${result.error}`)
      }
    }
  }

  // ── Radarr ────────────────────────────────────────────────────────────────

  private radarrKey(item: RadarrQueueItem): string {
    return `radarr:${item.movieId ?? item.movie?.id ?? item.id}`
  }

  private async processRadarrItem(item: RadarrQueueItem): Promise<void> {
    const newState = mapTrackedState(item)
    if (!newState) return

    const key = this.radarrKey(item)
    const tmdbId = item.movie?.tmdbId ? String(item.movie.tmdbId) : null
    if (!tmdbId) return
    if (!this.shouldDispatchTransition(key, newState, `${tmdbId}:x`)) return

    const { media, requester } = await this.buildContextMovie(tmdbId, item.movie?.title ?? item.title)
    if (!media) return

    const download = {
      quality: this.extractQuality(item.title),
      size: this.formatSize(item.size),
      releaseName: item.title,
    }

    // Mémoriser le contexte pour le cleanup (au cas où l'item disparaît avant `importing`)
    this.lastContext.set(key, { media, requester, download })

    const result = await dispatch(EVENT_FOR_STATE[newState], { media, requester, download })

    if (result.success) {
      this.lastState.set(key, newState)
      if (!result.wasDuplicate) {
        logger.info(`[NotifV2][QueuePoller][Radarr] ${EVENT_FOR_STATE[newState]} dispatched for tmdbId=${tmdbId}`)
      }
    }
  }

  // ── Sonarr ────────────────────────────────────────────────────────────────

  private sonarrKey(item: SonarrQueueItem): string {
    const seriesId = item.seriesId ?? item.series?.id ?? 0
    const seasonNum = item.episode?.seasonNumber ?? item.seasonNumber ?? 0
    return `sonarr:${seriesId}:${seasonNum}`
  }

  /** Groupe les items Sonarr par série+saison et retourne l'état le plus avancé du groupe. */
  private groupSonarrBySeason(items: SonarrQueueItem[]): Array<{
    key: string
    seriesId: number
    tvdbId: number
    seasonNumber: number
    seriesTitle: string
    state: TrackedState
    sample: SonarrQueueItem
  }> {
    const groups = new Map<
      string,
      { items: SonarrQueueItem[]; seriesId: number; tvdbId: number; seasonNumber: number; seriesTitle: string }
    >()

    for (const item of items) {
      if (!item.series?.tvdbId) continue
      const seasonNum = item.episode?.seasonNumber ?? item.seasonNumber
      if (seasonNum == null) continue
      const key = this.sonarrKey(item)
      const existing = groups.get(key)
      if (existing) {
        existing.items.push(item)
      } else {
        groups.set(key, {
          items: [item],
          seriesId: item.series.id,
          tvdbId: item.series.tvdbId,
          seasonNumber: seasonNum,
          seriesTitle: item.series.title,
        })
      }
    }

    // Pour chaque groupe, prendre l'état le plus avancé (max sur STATE_ORDER)
    const result: Array<{
      key: string
      seriesId: number
      tvdbId: number
      seasonNumber: number
      seriesTitle: string
      state: TrackedState
      sample: SonarrQueueItem
    }> = []

    for (const [key, group] of groups) {
      let bestState: TrackedState | null = null
      let bestIdx = -1
      let sample: SonarrQueueItem = group.items[0]
      for (const it of group.items) {
        const s = mapTrackedState(it)
        if (!s) continue
        const idx = STATE_ORDER.indexOf(s)
        if (idx > bestIdx) {
          bestIdx = idx
          bestState = s
          sample = it
        }
      }
      if (bestState) {
        result.push({ ...group, key, state: bestState, sample })
      }
    }

    return result
  }

  private async processSonarrGroup(group: {
    key: string
    tvdbId: number
    seasonNumber: number
    seriesTitle: string
    state: TrackedState
    sample: SonarrQueueItem
  }): Promise<void> {
    const tmdbId = await this.resolveTvdbToTmdb(group.tvdbId)
    if (!tmdbId) return

    const mediaKey = `${tmdbId}:${group.seasonNumber}`
    // Re-vérifier shouldDispatch avec mediaKey DB avant de calculer missedStates
    if (!this.shouldDispatchTransition(group.key, group.state, mediaKey)) return

    const statesToDispatch = this.missedStates(group.key, group.state)
    if (statesToDispatch.length === 0) return

    const { media, requester } = await this.buildContextSeries(
      tmdbId,
      group.seriesTitle,
      group.seasonNumber
    )
    if (!media) return

    const download = {
      quality: this.extractQuality(group.sample.title),
      size: this.formatSize(group.sample.size),
      releaseName: group.sample.title,
    }

    // Mémoriser le contexte pour le cleanup (au cas où l'item disparaît avant `importing`)
    this.lastContext.set(group.key, { media, requester, download })

    // Dispatch chaque état manqué dans l'ordre (downloading → dl_complete → importing)
    // Délai de 1.2s entre chaque état pour garantir l'ordre d'affichage côté notif
    for (let i = 0; i < statesToDispatch.length; i++) {
      const state = statesToDispatch[i]
      if (i > 0) await new Promise((r) => setTimeout(r, 1200))
      const event = EVENT_FOR_STATE[state]
      const result = await dispatch(event, { media, requester, download })

      if (result.success) {
        this.lastState.set(group.key, state)
        if (result.wasDuplicate) {
          logger.info(
            `[NotifV2][QueuePoller][Sonarr] ${event} duplicate (dedup hit) for tmdbId=${tmdbId} S${group.seasonNumber} → no notif sent`
          )
        } else {
          logger.info(
            `[NotifV2][QueuePoller][Sonarr] ${event} dispatched for tmdbId=${tmdbId} S${group.seasonNumber} → ${result.recipients.length} recipient(s)`
          )
        }
      } else {
        logger.warn(
          `[NotifV2][QueuePoller][Sonarr] ${event} dispatch FAILED for tmdbId=${tmdbId} S${group.seasonNumber}: ${result.error}`
        )
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Décide si la transition vers `newState` doit déclencher un dispatch.
   * Vérifie à la fois l'état mémoire ET l'état DB (anti-régression post-restart).
   * mediaKey = `tmdbId:season` (optionnel — si fourni, vérifie aussi dbStateByMedia)
   */
  private shouldDispatchTransition(key: string, newState: TrackedState, mediaKey?: string): boolean {
    const prev = this.lastState.get(key)
    const newIdx = STATE_ORDER.indexOf(newState)
    const memIdx = prev ? STATE_ORDER.indexOf(prev) : -1
    if (newIdx <= memIdx) return false
    // Vérifier aussi l'état DB chargé au démarrage
    if (mediaKey) {
      const dbState = this.dbStateByMedia.get(mediaKey)
      const dbIdx = dbState ? STATE_ORDER.indexOf(dbState) : -1
      if (newIdx <= dbIdx) {
        // Sync l'état mémoire avec la DB pour les ticks suivants
        if (dbIdx > memIdx) this.lastState.set(key, dbState!)
        return false
      }
    }
    return true
  }

  /**
   * Retourne tous les états entre `prev` (exclusif) et `newState` (inclusif).
   * Permet d'émettre les états intermédiaires manqués (ex: passage direct de
   * `downloading` à `importing` → on émet aussi `download_complete`).
   */
  private missedStates(key: string, newState: TrackedState): TrackedState[] {
    const prev = this.lastState.get(key)
    const newIdx = STATE_ORDER.indexOf(newState)
    const prevIdx = prev ? STATE_ORDER.indexOf(prev) : -1
    if (newIdx <= prevIdx) return []
    return STATE_ORDER.slice(prevIdx + 1, newIdx + 1)
  }

  /**
   * Recharge depuis la DB les événements de queue dispatchés sur les 7 derniers jours.
   * Stocke l'état max par clé `tmdbId:season` dans dbStateByMedia.
   * Permet de ne pas régresser après un redémarrage du container, même après minuit.
   *
   * Format dedup_key: req:<userId>:<mediaType>:<tmdbId>:<event>[:<season>]:<date>
   *                   tmdb:<mediaType>:<tmdbId>:<event>[:<season>]:<date>
   */
  private async seedLastStateFromDb(): Promise<void> {
    try {
      const windowStart = new Date()
      windowStart.setDate(windowStart.getDate() - 7)
      windowStart.setHours(0, 0, 0, 0)
      const rows = await db
        .select({ event: notificationEvents.event, tmdbId: notificationEvents.tmdbId, mediaType: notificationEvents.mediaType, payload: notificationEvents.payload })
        .from(notificationEvents)
        .where(gte(notificationEvents.createdAt, windowStart))

      for (const row of rows) {
        const state = STATE_FOR_EVENT[row.event as NotificationEvent]
        if (!state || !row.tmdbId) continue
        // Extraire le seasonNumber depuis le payload JSON
        let seasonNumber: number | undefined
        try {
          const p = JSON.parse(row.payload ?? '{}')
          seasonNumber = p?.media?.seasonNumber
        } catch {}
        const mediaKey = `${row.tmdbId}:${seasonNumber ?? 'x'}`
        const existing = this.dbStateByMedia.get(mediaKey)
        const existingIdx = existing ? STATE_ORDER.indexOf(existing) : -1
        if (STATE_ORDER.indexOf(state) > existingIdx) {
          this.dbStateByMedia.set(mediaKey, state)
        }
      }
      if (this.dbStateByMedia.size > 0) {
        logger.info(`[NotifV2][QueuePoller] DB seed: ${this.dbStateByMedia.size} media state(s) loaded from today`)
      }
    } catch (e) {
      logger.warn('[NotifV2][QueuePoller] DB seed failed (non-blocking):', e)
    }
  }

  private async resolveTvdbToTmdb(tvdbId: number): Promise<string | null> {
    const cached = this.tvdbToTmdb.get(tvdbId)
    if (cached) return cached
    try {
      const tmdb = await getTmdbService()
      if (!tmdb) return null
      const result = await tmdb.findByExternalId(tvdbId, 'tvdb_id')
      const tv = result?.tv_results?.[0]
      if (tv?.id) {
        const resolvedTmdbId = String(tv.id)
        this.tvdbToTmdb.set(tvdbId, resolvedTmdbId)
        return resolvedTmdbId
      }
    } catch {
      // ignore
    }
    return null
  }

  private async buildContextMovie(
    tmdbId: string,
    fallbackTitle: string
  ): Promise<{ media: MediaInfo | null; requester?: RequesterInfo }> {
    const req = await db.query.mediaRequests.findFirst({
      where: and(eq(mediaRequests.tmdbId, tmdbId), eq(mediaRequests.mediaType, 'movie')),
      with: { user: true },
    })

    let meta: Record<string, unknown> = {}
    try {
      meta = req?.metadata ? JSON.parse(req.metadata) : {}
    } catch {}

    const media: MediaInfo = {
      tmdbId,
      mediaType: 'movie',
      title: req?.title ?? fallbackTitle,
      year: meta.year as string | undefined,
      overview: meta.overview as string | undefined,
      posterPath: meta.posterPath as string | undefined,
    }

    const requester = req?.user
      ? {
          id: req.user.id,
          name: req.user.name ?? undefined,
          email: req.user.email ?? undefined,
          whatsappNumber: (req.user as Record<string, unknown>).whatsappNumber as string | undefined,
        }
      : undefined

    return { media, requester }
  }

  private async buildContextSeries(
    tmdbId: string,
    fallbackTitle: string,
    seasonNumber: number
  ): Promise<{ media: MediaInfo | null; requester?: RequesterInfo }> {
    const req = await db.query.mediaRequests.findFirst({
      where: and(eq(mediaRequests.tmdbId, tmdbId), eq(mediaRequests.mediaType, 'tv')),
      with: { user: true },
    })

    let meta: Record<string, unknown> = {}
    try {
      meta = req?.metadata ? JSON.parse(req.metadata) : {}
    } catch {}

    const baseTitle = req?.title ?? fallbackTitle
    const media: MediaInfo = {
      tmdbId,
      mediaType: 'tv',
      title: `${baseTitle} — Saison ${seasonNumber}`,
      year: meta.year as string | undefined,
      overview: meta.overview as string | undefined,
      posterPath: meta.posterPath as string | undefined,
      seasonNumber,
    }

    const requester = req?.user
      ? {
          id: req.user.id,
          name: req.user.name ?? undefined,
          email: req.user.email ?? undefined,
          whatsappNumber: (req.user as Record<string, unknown>).whatsappNumber as string | undefined,
        }
      : undefined

    return { media, requester }
  }

  private extractQuality(name?: string): string | undefined {
    if (!name) return undefined
    const m = name.match(/\b(2160p|1080p|720p|480p)\b/i)
    return m ? m[1] : undefined
  }

  private formatSize(bytes?: number): string | undefined {
    if (!bytes || bytes <= 0) return undefined
    const gb = bytes / 1_073_741_824
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`
  }
}
