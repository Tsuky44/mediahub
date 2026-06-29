/**
 * EpisodeImportBatcher — groupe les événements d'import d'épisodes pour éviter le spam.
 *
 * Problème : Quand Sonarr importe un pack de saison (ex : 10 épisodes), il déclenche
 * le webhook d'import séparément pour chaque fichier d'épisode en succession rapide.
 * Cela contourne nos filtres et spamme les notifications "Épisode disponible" individuelles.
 *
 * Solution : Attendre 10 secondes après un import d'épisode. Si d'autres épisodes pour la même
 * série/saison arrivent, on les accumule. À la fin de la fenêtre, si on a accumulé exactement
 * 1 épisode, on dispatch EPISODE_AVAILABLE. Si on en a plusieurs, c'est un pack ou un batch,
 * donc on ignore silencieusement pour laisser les notifications de saison globales gérer l'info.
 */

import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import { logger } from '@/lib/logger'

interface ImportData {
  tmdbId: string
  title: string
  overview?: string
  posterPath?: string
  seasonNumber: number
  requester?: {
    id: number
    name?: string
    email?: string
    whatsappNumber?: string
  }
}

interface PendingImportBatch {
  data: ImportData
  episodes: Set<number>
}

const BATCH_WINDOW_MS = 30000 // 30 secondes est parfait pour grouper les imports successifs lors d'importations lentes

export class EpisodeImportBatcher {
  private timers = new Map<string, NodeJS.Timeout>()
  private batches = new Map<string, PendingImportBatch>()

  add(tmdbId: string, seasonNumber: number, episodeNumber: number, data: ImportData): void {
    // Grouper par série ET saison (clé = tmdbId:seasonNumber)
    const key = `${tmdbId}:${seasonNumber}`

    if (!this.batches.has(key)) {
      if (this.batches.size >= 100) {
        const oldestKey = this.batches.keys().next().value
        if (oldestKey) {
          logger.warn(`[EpisodeImportBatcher] Max batches reached (100), flushing oldest key: ${oldestKey}`)
          if (this.timers.has(oldestKey)) {
            clearTimeout(this.timers.get(oldestKey)!)
            this.timers.delete(oldestKey)
          }
          this.flush(oldestKey).catch(() => {})
        }
      }
      this.batches.set(key, { data, episodes: new Set() })
    }

    const batch = this.batches.get(key)!
    batch.episodes.add(episodeNumber)

    if (data.requester && !batch.data.requester) {
      batch.data.requester = data.requester
    }

    // Reset le timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    const timer = setTimeout(() => {
      this.flush(key).catch((err) => {
        logger.error(`[EpisodeImportBatcher] Error flushing batch for ${key}:`, err)
      })
    }, BATCH_WINDOW_MS)
    this.timers.set(key, timer)

    logger.info(
      `[EpisodeImportBatcher] tmdbId=${tmdbId} S${seasonNumber}E${episodeNumber} ajouté (fenêtre ${BATCH_WINDOW_MS}ms, épisodes=[${Array.from(batch.episodes).join(', ')}])`
    )
  }

  private async flush(key: string): Promise<void> {
    const batch = this.batches.get(key)
    if (!batch) return

    this.batches.delete(key)
    this.timers.delete(key)

    const episodes = Array.from(batch.episodes).sort((a, b) => a - b)
    const { data } = batch

    logger.info(
      `[EpisodeImportBatcher] Flush ${key} — ${episodes.length} épisode(s) trouvé(s)`
    )

    // On ne dispatch que s'il y a exactement 1 épisode importé durant la fenêtre de 10s
    // (Garantit que c'est une sortie hebdomadaire unitaire et non un pack/batch)
    if (episodes.length === 1) {
      const epNum = episodes[0]
      logger.info(`[EpisodeImportBatcher] Dispatch EPISODE_AVAILABLE pour l'épisode unique S${data.seasonNumber}E${epNum}`)
      await dispatch(NOTIFICATION_EVENTS.EPISODE_AVAILABLE, {
        media: {
          tmdbId: data.tmdbId,
          mediaType: 'tv',
          title: data.title,
          overview: data.overview,
          posterPath: data.posterPath,
          seasonNumber: data.seasonNumber,
          episodeNumber: epNum,
        } as any,
        requester: data.requester,
      }).catch((err) => {
        logger.error(`[EpisodeImportBatcher] Dispatch failed:`, err)
      })
    } else {
      logger.info(
        `[EpisodeImportBatcher] Ignoré ${episodes.length} épisodes pour ${data.title} S${data.seasonNumber} car c'est un import groupé (pack/batch).`
      )
    }
  }
}

export const episodeImportBatcher = new EpisodeImportBatcher()
