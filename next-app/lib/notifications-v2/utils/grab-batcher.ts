/**
 * SeasonGrabBatcher — groupe les événements Grab par série sur une fenêtre temporelle.
 *
 * Problème : Sonarr envoie un webhook Grab par pack. Si S1 et S2 sont dans
 * deux packs séparés, on reçoit 2 webhooks. On veut 1 seule notif "S1-2".
 *
 * Solution : attendre 5s après le premier Grab d'une série. Si d'autres saisons
 * arrivent dans cette fenêtre, on les regroupe. Puis on envoie la notif.
 *
 * NOTE: Fonctionne en mono-instance (Docker auto-hébergé). En multi-instance
 * (Vercel/serverless), le batching ne sera pas fiable.
 */

import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import { formatSeasonList } from './season-formatter'
import { logger } from '@/lib/logger'

interface GrabData {
  tmdbId: string
  title: string
  overview?: string
  posterPath?: string
  requester?: {
    id: number
    name?: string
    email?: string
    whatsappNumber?: string
  }
  download?: {
    quality?: string
    size?: string
    releaseName?: string
  }
}

interface PendingBatch {
  data: GrabData
  seasons: Set<number>
}

const BATCH_WINDOW_MS = 5000

export class SeasonGrabBatcher {
  private timers = new Map<string, NodeJS.Timeout>()
  private batches = new Map<string, PendingBatch>()

  add(tmdbId: string, seasonNumber: number, data: GrabData): void {
    const key = String(tmdbId)

    if (!this.batches.has(key)) {
      if (this.batches.size >= 50) {
        const oldestKey = this.batches.keys().next().value
        if (oldestKey) {
          logger.warn(`[GrabBatcher] Max batches reached (50), flushing oldest key: ${oldestKey}`)
          if (this.timers.has(oldestKey)) {
            clearTimeout(this.timers.get(oldestKey)!)
            this.timers.delete(oldestKey)
          }
          this.flush(oldestKey)
        }
      }
      this.batches.set(key, { data, seasons: new Set() })
    }

    const batch = this.batches.get(key)!
    batch.seasons.add(seasonNumber)

    // Merge requester/download si la nouvelle donnée est plus riche
    if (data.requester && !batch.data.requester) batch.data.requester = data.requester
    if (data.download && !batch.data.download) batch.data.download = data.download

    // Reset le timer existant
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    // Nouveau timer
    const timer = setTimeout(() => {
      this.flush(key)
    }, BATCH_WINDOW_MS)
    this.timers.set(key, timer)

    logger.info(
      `[GrabBatcher] tmdbId=${tmdbId} S${seasonNumber} ajouté (fenêtre ${BATCH_WINDOW_MS}ms, saisons=[${Array.from(batch.seasons).join(', ')}])`
    )
  }

  private flush(key: string): void {
    const batch = this.batches.get(key)
    if (!batch) return

    this.batches.delete(key)
    this.timers.delete(key)

    const seasons = Array.from(batch.seasons).sort((a, b) => a - b)
    const { data } = batch

    if (seasons.length === 1) {
      logger.info(`[GrabBatcher] Flush tmdbId=${key} — 1 saison (S${seasons[0]})`)
      dispatch(NOTIFICATION_EVENTS.MEDIA_GRABBED, {
        media: {
          tmdbId: data.tmdbId,
          mediaType: 'tv',
          title: `${data.title} - Saison ${seasons[0]}`,
          overview: data.overview,
          posterPath: data.posterPath,
          seasonNumber: seasons[0],
        },
        requester: data.requester,
        download: data.download,
      }).catch((err) => {
        logger.error(`[GrabBatcher] Dispatch failed for single season:`, err)
      })
    } else {
      const seasonLabel = formatSeasonList(seasons)
      logger.info(`[GrabBatcher] Flush tmdbId=${key} — ${seasons.length} saisons groupées (${seasonLabel})`)
      dispatch(NOTIFICATION_EVENTS.MEDIA_GRABBED, {
        media: {
          tmdbId: data.tmdbId,
          mediaType: 'tv',
          title: `${data.title} - ${seasonLabel}`,
          overview: data.overview,
          posterPath: data.posterPath,
        },
        requester: data.requester,
        download: data.download,
      }).catch((err) => {
        logger.error(`[GrabBatcher] Dispatch failed for grouped seasons:`, err)
      })
    }
  }
}

export const grabBatcher = new SeasonGrabBatcher()
