/**
 * Persistance des intentions de téléchargement.
 *
 * Le Grab et l'import peuvent être séparés de plusieurs heures : le verdict
 * doit survivre à un redémarrage, d'où une table plutôt qu'une Map en mémoire.
 */

import { db } from '@/lib/db/drizzle'
import { downloadIntents } from '@/lib/db/schema'
import { eq, lt } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { IntentClassification } from './download-intent'

export interface DownloadIntentRecord {
  downloadId: string
  tmdbId: string
  seasonNumber: number | null
  episodeNumbers: number[]
  releaseType: string | null
  releaseTitle: string | null
  classification: IntentClassification
  reason: string | null
  airDateUtc: Date | null
  createdAt: Date
}

export interface RecordIntentParams {
  downloadId: string
  tmdbId: string
  seasonNumber?: number
  episodeNumbers: number[]
  releaseType?: string
  releaseTitle?: string
  classification: IntentClassification
  reason?: string
  airDateUtc?: Date
}

/**
 * Enregistre le verdict du Grab.
 * Idempotent : Sonarr peut renvoyer le même Grab (retry, redémarrage).
 */
export async function recordIntent(params: RecordIntentParams): Promise<void> {
  try {
    await db
      .insert(downloadIntents)
      .values({
        downloadId: params.downloadId,
        tmdbId: params.tmdbId,
        seasonNumber: params.seasonNumber ?? null,
        episodeNumbers: JSON.stringify(params.episodeNumbers),
        releaseType: params.releaseType ?? null,
        releaseTitle: params.releaseTitle ?? null,
        classification: params.classification,
        reason: params.reason ?? null,
        airDateUtc: params.airDateUtc ?? null,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: downloadIntents.downloadId,
        set: {
          classification: params.classification,
          reason: params.reason ?? null,
          episodeNumbers: JSON.stringify(params.episodeNumbers),
          releaseType: params.releaseType ?? null,
          airDateUtc: params.airDateUtc ?? null,
        },
      })
  } catch (err) {
    // Non bloquant : perdre une intention dégrade la classification, mais ne
    // doit jamais faire échouer le traitement du webhook.
    logger.warn('[DownloadIntent] Enregistrement échoué:', err)
  }
}

export async function getIntent(downloadId: string): Promise<DownloadIntentRecord | null> {
  try {
    const row = await db.query.downloadIntents.findFirst({
      where: eq(downloadIntents.downloadId, downloadId),
    })
    if (!row) return null
    return {
      downloadId: row.downloadId,
      tmdbId: row.tmdbId,
      seasonNumber: row.seasonNumber,
      episodeNumbers: safeParseNumbers(row.episodeNumbers),
      releaseType: row.releaseType,
      releaseTitle: row.releaseTitle,
      classification: row.classification as IntentClassification,
      reason: row.reason,
      airDateUtc: row.airDateUtc,
      createdAt: row.createdAt,
    }
  } catch (err) {
    logger.warn('[DownloadIntent] Lecture échouée:', err)
    return null
  }
}

/** Les intentions non consommées s'accumuleraient sinon indéfiniment. */
export async function purgeStaleIntents(olderThanMs = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - olderThanMs)
    await db.delete(downloadIntents).where(lt(downloadIntents.createdAt, cutoff))
  } catch (err) {
    logger.warn('[DownloadIntent] Purge échouée:', err)
  }
}

function safeParseNumbers(v: string): number[] {
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}
