/**
 * AvailabilityPoller — polls for media that has just become AVAILABLE
 * on the media server (Emby), by watching `MediaRequest.status` transitions.
 *
 * V2: utilise la table notification_events (dedup via UNIQUE constraint)
 * au lieu du JSON stocké dans settings. Plus fiable, pas de race conditions.
 *
 * Simplifié V3: Fallback uniquement pour détecter MEDIA_AVAILABLE quand les webhooks ratent.
 * Interval 30s (pas critique, les webhooks sont temps réel).
 */

import { db } from '@/lib/db/drizzle'
import { mediaRequests, users, notificationEvents } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { ConfigStore } from '../config/config-store'
import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import type { MediaInfo } from '../types'
import { seedExistingEvents } from '../store'
import { buildDedupKey } from '../store/dedup-key'
import { tryDispatchGroupedAvailability } from '../utils/grouped-availability'
import { getSonarrService } from '@/lib/services/sonarr'

export class AvailabilityPoller {
  private started = false
  private isFirstRun = true
  private timer: NodeJS.Timeout | null = null
  /** Cache des dedup_keys déjà traitées — évite les appels DB inutiles à chaque tick */
  private readonly notifiedKeys = new Set<string>()

  constructor(private readonly intervalMs = 30_000) {}

  start(): void {
    if (this.started) return
    this.started = true
    this.tick().catch(() => {})
    this.timer = setInterval(() => this.tick().catch(() => {}), this.intervalMs)
    logger.info(`[NotificationsV2][AvailabilityPoller] Started (every ${this.intervalMs / 1000}s)`)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  private async tick(): Promise<void> {
    const config = await ConfigStore.load()
    if (!config.enabled) return

    const availableReqs = await db.query.mediaRequests.findMany({
      where: eq(mediaRequests.status, 5),
      orderBy: [desc(mediaRequests.requestedAt)],
      limit: 500,
    })

    // Startup seed — silence all currently-available requests en créant des rows
    // "dispatched" dans notification_events. Cela évite le spam au démarrage.
    if (this.isFirstRun) {
      this.isFirstRun = false
      const ids = availableReqs.map((r) => r.id)
      await seedExistingEvents(ids)

      // Pré-remplir le cache en mémoire avec les dedup_keys existantes
      const existingRows = await db.query.notificationEvents.findMany({
        where: eq(notificationEvents.event, NOTIFICATION_EVENTS.MEDIA_AVAILABLE),
        columns: { dedupKey: true },
      })
      for (const row of existingRows) {
        if (row.dedupKey) this.notifiedKeys.add(row.dedupKey)
      }

      logger.info(`[NotificationsV2][AvailabilityPoller] Startup seed: ${ids.length} silenced (${this.notifiedKeys.size} keys cached)`)
      return
    }

    // Récupérer la queue Sonarr une seule fois pour tout le tick
    let sonarrQueueByTvdbId = new Map<number, Set<number>>() // tvdbId → Set<seasonNumber en queue>
    try {
      const sonarr = await getSonarrService()
      if (sonarr) {
        const queue = await sonarr.getQueue().catch(() => [])
        for (const q of queue) {
          const tvdbId = q.series?.tvdbId
          if (!tvdbId) continue
          const seasonNum = q.episode?.seasonNumber ?? q.seasonNumber
          if (seasonNum == null) continue
          const tState = (q.trackedDownloadState || '').toLowerCase()
          if (tState === 'completed' || tState === 'imported' || tState === 'failed') continue
          if (!sonarrQueueByTvdbId.has(tvdbId)) sonarrQueueByTvdbId.set(tvdbId, new Set())
          sonarrQueueByTvdbId.get(tvdbId)!.add(seasonNum)
        }
      }
    } catch (e) {
      logger.warn('[NotificationsV2][AvailabilityPoller] Failed to fetch Sonarr queue:', e)
    }

    // Grouper les requêtes disponibles par (tmdbId, userId) pour les demandes multi-saisons TV
    // Une demande multi-saisons (S1+S2) doit produire une seule notif globale.
    type ReqRow = (typeof availableReqs)[number] & { _meta?: Record<string, unknown> }
    const grouped = new Map<string, ReqRow[]>()
    for (const req of availableReqs as ReqRow[]) {
      let meta: Record<string, unknown> = {}
      try { meta = req.metadata ? JSON.parse(req.metadata) : {} } catch {}
      req._meta = meta
      const key = `${req.tmdbId}:${req.userId ?? 'anon'}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(req)
    }

    for (const [, reqs] of grouped) {
      const rep = reqs[0]
      const meta = (rep as ReqRow)._meta ?? {}

      // Collecter toutes les saisons demandées par ce groupe
      const allRequestedSeasons: number[] = []
      for (const r of reqs) {
        const m = (r as ReqRow)._meta ?? {}
        const seasons = m.seasons
        if (Array.isArray(seasons)) {
          for (const s of seasons) {
            const n = typeof s === 'number' ? s : (s as Record<string, unknown>)?.seasonNumber
            if (typeof n === 'number' && !allRequestedSeasons.includes(n)) allRequestedSeasons.push(n)
          }
        }
      }

      // Récupérer le requester
      let requester
      if (rep.userId) {
        const user = await db.query.users.findFirst({ where: eq(users.id, rep.userId) })
        if (user) {
          requester = {
            id: user.id,
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            whatsappNumber: (user as any).whatsappNumber ?? undefined,
          }
        }
      }

      // Demande TV multi-saisons → logique groupée
      if (rep.mediaType === 'tv' && allRequestedSeasons.length > 1) {
        // Résoudre tmdbId → tvdbId pour vérifier la queue Sonarr
        let tvdbId: number | undefined
        try {
          const { getTmdbService } = await import('@/lib/services/tmdb')
          const tmdb = await getTmdbService()
          if (tmdb) {
            const extIds = await tmdb.getExternalIds('tv', parseInt(rep.tmdbId)) as Record<string, unknown> | null
            const raw = extIds?.tvdb_id
            if (typeof raw === 'number') tvdbId = raw
          }
        } catch {}

        const pendingInQueueSeasons = tvdbId
          ? [...(sonarrQueueByTvdbId.get(tvdbId) ?? [])]
          : []

        const prospectKey = buildDedupKey(
          NOTIFICATION_EVENTS.MEDIA_AVAILABLE,
          { tmdbId: rep.tmdbId, mediaType: 'tv', title: rep.title, seasons: allRequestedSeasons.sort((a, b) => a - b) },
          requester
        )
        if (this.notifiedKeys.has(prospectKey)) continue

        const result = await tryDispatchGroupedAvailability({
          tmdbId: rep.tmdbId,
          tvdbId: tvdbId ?? 0,
          title: rep.title,
          overview: meta.overview as string | undefined,
          posterPath: meta.posterPath as string | undefined,
          requester,
          pendingInQueueSeasons,
        })

        if (result.dispatched) {
          this.notifiedKeys.add(prospectKey)
        }
        continue
      }

      // Demande mono-saison ou film → comportement existant
      let seasonNumber: number | undefined
      if (rep.mediaType === 'tv' && allRequestedSeasons.length === 1) {
        seasonNumber = allRequestedSeasons[0]
      }

      const media: MediaInfo = {
        tmdbId: rep.tmdbId,
        mediaType: rep.mediaType as 'tv' | 'movie',
        title: seasonNumber != null ? `${rep.title} — Saison ${seasonNumber}` : rep.title,
        year: meta.year as string | undefined,
        overview: meta.overview as string | undefined,
        posterPath: meta.posterPath as string | undefined,
        genres: Array.isArray(meta.genres) ? (meta.genres as string[]).join(', ') : undefined,
        seasonNumber,
      }

      const prospectKey = buildDedupKey(NOTIFICATION_EVENTS.MEDIA_AVAILABLE, media, requester)
      if (this.notifiedKeys.has(prospectKey)) continue

      const result = await dispatch(NOTIFICATION_EVENTS.MEDIA_AVAILABLE, { media, requester })

      if (result.wasDuplicate) {
        this.notifiedKeys.add(prospectKey)
      } else if (result.success) {
        this.notifiedKeys.add(prospectKey)
        logger.info(`[NotificationsV2][AvailabilityPoller] Dispatched MEDIA_AVAILABLE for req #${rep.id} to ${result.recipients.length} recipient(s)`)
      } else {
        logger.error(`[NotificationsV2][AvailabilityPoller] Failed to dispatch MEDIA_AVAILABLE for req #${rep.id}: ${result.error}`)
      }
    }
  }
}
