/**
 * grouped-availability.ts
 *
 * Helper partagé (webhook Sonarr + AvailabilityPoller) pour la logique de
 * notification MEDIA_AVAILABLE groupée multi-saisons.
 *
 * Règle :
 *  - Si une demande couvre plusieurs saisons (ex: S1+S2), on n'envoie qu'une
 *    seule notif globale, quand TOUTES les saisons demandées sont sorties de
 *    la queue Sonarr (ou disponibles en DB).
 *  - Si certaines saisons sont introuvables/incomplètes → notif partielle.
 */

import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import type { RequesterInfo } from '../types'

export interface SeasonStatus {
  seasonNumber: number
  complete: boolean
}

export interface GroupedAvailabilityResult {
  /** true si une notif a été émise (ou était déjà dupliquée) */
  dispatched: boolean
  /** true si toutes les saisons demandées sont complètes */
  allComplete: boolean
  /** saisons présentes mais incomplètes */
  partialSeasons: number[]
  /** saisons demandées mais absentes */
  missingSeasons: number[]
  /**
   * true si au moins une demande groupée (multi-saisons) a été détectée.
   * Même si dispatched=false (en attente de queue), le webhook doit bloquer
   * le fallback mono-saison pour ne pas envoyer des notifs individuelles.
   */
  isGrouped: boolean
  /** Saisons couvertes par une demande groupée (pour bloquer le fallback) */
  groupedSeasons: number[]
}

/**
 * Tente de dispatcher la notif de disponibilité groupée pour une demande TV.
 *
 * Le helper interroge Sonarr directement pour connaître l'état de TOUTES les
 * saisons de la demande (pas seulement celles du webhook courant).
 *
 * @param tmdbId     TMDB ID de la série
 * @param tvdbId     TVDB ID (pour interroger Sonarr)
 * @param title      Titre de la série
 * @param overview   Synopsis (optionnel)
 * @param posterPath Poster (optionnel)
 * @param requester  Requester (optionnel)
 * @param pendingInQueueSeasons  Saisons encore en queue Sonarr (bloque la notif)
 */
export async function tryDispatchGroupedAvailability(params: {
  tmdbId: string
  tvdbId: number
  title: string
  overview?: string
  posterPath?: string
  requester?: RequesterInfo
  pendingInQueueSeasons: number[]
}): Promise<GroupedAvailabilityResult> {
  const { tmdbId, tvdbId, title, overview, posterPath, requester, pendingInQueueSeasons } = params

  // Récupérer uniquement les demandes TV non-disponibles (status != 5) pour ce tmdbId.
  // Les demandes avec status=5 sont des anciennes demandes déjà traitées (ex: S1 demandée
  // il y a 6 mois) — on ne doit pas les agréger avec la demande en cours (S5+S6).
  const requests = await db.query.mediaRequests.findMany({
    where: and(eq(mediaRequests.tmdbId, tmdbId), eq(mediaRequests.mediaType, 'tv'), ne(mediaRequests.status, 5)),
    orderBy: (t, { desc }) => [desc(t.requestedAt)],
  })

  if (requests.length === 0) {
    logger.warn(`[GroupedAvailability] No request found for tmdbId=${tmdbId}`)
    return { dispatched: false, allComplete: false, partialSeasons: [], missingSeasons: [], isGrouped: false, groupedSeasons: [] }
  }

  // Récupérer les stats de la série depuis Sonarr (une seule fois pour toutes les saisons)
  let sonarrSeasonStats = new Map<number, { episodeCount: number; episodeFileCount: number }>()
  try {
    const { getSonarrService } = await import('@/lib/services/sonarr')
    const sonarr = await getSonarrService()
    if (sonarr) {
      const series = await sonarr.getSeriesByTvdbId(tvdbId)
      for (const s of (series?.seasons ?? []) as Array<{
        seasonNumber: number
        statistics?: { episodeCount: number; episodeFileCount: number }
      }>) {
        if (s.statistics) {
          sonarrSeasonStats.set(s.seasonNumber, s.statistics)
        }
      }
    }
  } catch (e) {
    logger.warn(`[GroupedAvailability] Failed to fetch Sonarr series stats for tvdbId=${tvdbId}:`, e)
  }

  // Regrouper les demandes par userId pour gérer plusieurs demandeurs indépendants
  const byUser = new Map<string, typeof requests>()
  for (const req of requests) {
    const key = req.userId != null ? String(req.userId) : 'anonymous'
    if (!byUser.has(key)) byUser.set(key, [])
    byUser.get(key)!.push(req)
  }

  let anyDispatched = false
  let isGrouped = false
  const groupedSeasons = new Set<number>()

  for (const [, userRequests] of byUser) {
    // Rassembler toutes les saisons demandées par cet utilisateur
    const requestedSeasons = new Set<number>()
    for (const req of userRequests) {
      let meta: Record<string, unknown> = {}
      try { meta = req.metadata ? JSON.parse(req.metadata) : {} } catch {}
      const seasons = meta.seasons
      if (Array.isArray(seasons) && seasons.length > 0) {
        for (const s of seasons) {
          const n = typeof s === 'number' ? s : (s as Record<string, unknown>)?.seasonNumber
          if (typeof n === 'number') requestedSeasons.add(n)
        }
      } else {
        // Demande sans seasons[] → pas de groupement, géré par l'appelant
        continue
      }
    }

    if (requestedSeasons.size <= 1) {
      // Demande mono-saison → pas de groupement, géré par l'appelant
      continue
    }

    const sortedRequested = [...requestedSeasons].sort((a, b) => a - b)

    // Marquer comme grouped dès qu'on a une demande multi-saisons
    isGrouped = true
    for (const s of sortedRequested) groupedSeasons.add(s)

    // Vérifier si au moins une saison demandée est encore en queue → attendre
    const stillWaiting = sortedRequested.filter((s) => pendingInQueueSeasons.includes(s))
    if (stillWaiting.length > 0) {
      logger.info(
        `[GroupedAvailability] tmdbId=${tmdbId} seasons [${sortedRequested.join(',')}]: ` +
        `waiting for S${stillWaiting.join(',')} to leave queue`
      )
      continue
    }

    // Calculer le statut réel de chaque saison demandée via les stats Sonarr
    const completeSeasons: number[] = []
    const partialSeasons: number[] = []
    const missingSeasons: number[] = []

    for (const sn of sortedRequested) {
      const stats = sonarrSeasonStats.get(sn)
      if (!stats || stats.episodeFileCount === 0) {
        missingSeasons.push(sn)
      } else if (stats.episodeFileCount >= stats.episodeCount) {
        completeSeasons.push(sn)
      } else {
        partialSeasons.push(sn)
      }
    }

    // Si au moins une saison est manquante ET n'est pas en queue → c'est qu'elle
    // n'a pas été trouvée (release manquante). On dispatch quand même avec mention.
    // Mais si AUCUNE saison n'est dispo encore → on attend.
    const hasAny = completeSeasons.length + partialSeasons.length > 0
    if (!hasAny) {
      logger.info(`[GroupedAvailability] tmdbId=${tmdbId}: no seasons available yet, skipping`)
      continue
    }

    const allComplete = missingSeasons.length === 0 && partialSeasons.length === 0

    // Construire le titre et le message de statut
    const req = userRequests[0]
    let meta: Record<string, unknown> = {}
    try { meta = req.metadata ? JSON.parse(req.metadata) : {} } catch {}

    const requesterInfo: RequesterInfo | undefined = requester ?? (req.userId != null ? {
      id: req.userId,
      name: (req as Record<string, unknown>).requesterName as string | undefined ?? undefined,
      email: (req as Record<string, unknown>).requesterEmail as string | undefined ?? undefined,
    } : undefined)

    const seasonLabel = buildSeasonLabel(sortedRequested)

    let statusSuffix = ''
    if (!allComplete) {
      const parts: string[] = []
      if (partialSeasons.length > 0) parts.push(`S${partialSeasons.join(',')} incomplète${partialSeasons.length > 1 ? 's' : ''}`)
      if (missingSeasons.length > 0) parts.push(`S${missingSeasons.join(',')} introuvable${missingSeasons.length > 1 ? 's' : ''}`)
      statusSuffix = ` (${parts.join(', ')})`
    }

    const groupedTitle = `${title} — ${seasonLabel}${statusSuffix}`
    const event = allComplete
      ? NOTIFICATION_EVENTS.MEDIA_AVAILABLE
      : NOTIFICATION_EVENTS.SEASON_PARTIALLY_AVAILABLE

    const result = await dispatch(event, {
      media: {
        tmdbId,
        mediaType: 'tv',
        title: groupedTitle,
        year: meta.year as string | undefined,
        overview,
        posterPath,
        seasons: sortedRequested,
      },
      requester: requesterInfo,
    })

    if (result.success && !result.wasDuplicate) {
      logger.info(
        `[GroupedAvailability] ${event} dispatched for tmdbId=${tmdbId} [${sortedRequested.join(',')}] ` +
        `(all=${allComplete}, partial=${partialSeasons.join(',')}, missing=${missingSeasons.join(',')}) ` +
        `→ ${result.recipients.length} recipient(s)`
      )
      anyDispatched = true
    } else if (result.wasDuplicate) {
      logger.info(`[GroupedAvailability] ${event} duplicate for tmdbId=${tmdbId} [${sortedRequested.join(',')}]`)
      anyDispatched = true
    } else {
      logger.warn(`[GroupedAvailability] ${event} FAILED for tmdbId=${tmdbId}: ${result.error}`)
    }
  }

  return {
    dispatched: anyDispatched,
    allComplete: false,
    partialSeasons: [],
    missingSeasons: [],
    isGrouped,
    groupedSeasons: [...groupedSeasons],
  }
}

/** "Saison 1" / "Saisons 1-2" / "Saisons 1, 2, 4" */
function buildSeasonLabel(seasons: number[]): string {
  if (seasons.length === 1) return `Saison ${seasons[0]}`
  // Plage continue ?
  const isContiguous = seasons.every((s, i) => i === 0 || s === seasons[i - 1] + 1)
  if (isContiguous) return `Saisons ${seasons[0]}-${seasons[seasons.length - 1]}`
  return `Saisons ${seasons.join(', ')}`
}
