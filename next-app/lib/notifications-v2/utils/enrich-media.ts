/**
 * enrich-media.ts
 *
 * Complète un `MediaInfo` incomplet depuis TMDB avant que l'event ne soit
 * persisté par le dispatcher.
 *
 * Pourquoi ici et pas à la création de la demande : les sources d'events sont
 * multiples (webhooks Sonarr/Radarr, AvailabilityPoller lisant `mediaRequests.
 * metadata`, actions serveur) et plusieurs d'entre elles ne disposent que du
 * titre et du tmdbId. Historiquement le `metadata` des demandes est souvent
 * vide : le template affichait alors « () » pour l'année et aucun synopsis, et
 * `includePoster` ne produisait rien faute de `posterPath`.
 *
 * En enrichissant au dispatch, on répare aussi les demandes déjà en base sans
 * migration de données. Le payload persisté dans l'outbox contient les champs
 * complets : le rendu est donc identique quel que soit le moment de l'envoi.
 */

import { logger } from '@/lib/logger'
import { cached } from '@/lib/cache-service'
import { MS } from '@/lib/constants'
import type { MediaInfo } from '../types'
import { isInternalMediaCoverPath } from './poster-url'

/** Champs qu'on sait reconstruire depuis TMDB. */
interface TmdbFacts {
  title?: string
  year?: string
  overview?: string
  genres?: string
  rating?: string
  posterPath?: string
}

function isBlank(v: unknown): boolean {
  return v == null || String(v).trim().length === 0
}

/**
 * Récupère les faits TMDB pour un média, mis en cache 30 min.
 * Retourne `{}` en cas d'échec — l'enrichissement est toujours best-effort.
 */
async function fetchTmdbFacts(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbFacts> {
  return cached(
    `notifv2:tmdb-facts:${mediaType}:${tmdbId}`,
    async () => {
      try {
        const { getTmdbService } = await import('@/lib/services/tmdb')
        const tmdb = await getTmdbService()
        if (!tmdb) return {}

        const details = (await tmdb.getDetails(tmdbId, mediaType)) as Record<string, unknown> | null
        if (!details) return {}

        const dateStr = String(
          (mediaType === 'tv' ? details.first_air_date : details.release_date) ?? ''
        )
        const genreList = Array.isArray(details.genres)
          ? (details.genres as Array<{ name?: string }>)
              .map((g) => g?.name)
              .filter((n): n is string => !!n)
          : []
        const vote = details.vote_average

        const facts: TmdbFacts = {
          title: !isBlank(details.title) ? String(details.title) : (!isBlank(details.name) ? String(details.name) : undefined),
          year: dateStr.length >= 4 ? dateStr.slice(0, 4) : undefined,
          overview: !isBlank(details.overview) ? String(details.overview).trim() : undefined,
          genres: genreList.length > 0 ? genreList.join(', ') : undefined,
          // TMDB renvoie 0 quand aucun vote : ne pas afficher « 0 ».
          rating: typeof vote === 'number' && vote > 0 ? vote.toFixed(1) : undefined,
          posterPath: !isBlank(details.poster_path) ? String(details.poster_path) : undefined,
        }
        return facts
      } catch (err) {
        logger.warn(`[NotifV2][enrichMedia] TMDB lookup failed for ${mediaType}/${tmdbId}:`, err)
        return {}
      }
    },
    { memoryTtl: MS.THIRTY_MINUTES }
  )
}

/**
 * Retourne un `MediaInfo` complété. Ne remplace jamais une valeur déjà
 * renseignée, sauf un `posterPath` interne Sonarr/Radarr (inutilisable par un
 * destinataire externe) qu'on remplace par le poster TMDB s'il existe.
 *
 * Ne jette jamais : en cas d'échec, le média d'origine est renvoyé tel quel.
 */
export async function enrichMedia(media: MediaInfo): Promise<MediaInfo> {
  if (!media) return media

  const tmdbId = Number(media.tmdbId)
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return media
  if (media.mediaType !== 'movie' && media.mediaType !== 'tv') return media

  const posterUnusable = isBlank(media.posterPath) || isInternalMediaCoverPath(media.posterPath)
  const needs =
    isBlank(media.year) ||
    isBlank(media.overview) ||
    isBlank(media.genres) ||
    isBlank(media.rating) ||
    posterUnusable

  if (!needs) return media

  const facts = await fetchTmdbFacts(tmdbId, media.mediaType)
  if (Object.keys(facts).length === 0) return media

  const enriched: MediaInfo = {
    ...media,
    year: isBlank(media.year) ? facts.year ?? media.year : media.year,
    overview: isBlank(media.overview) ? facts.overview ?? media.overview : media.overview,
    genres: isBlank(media.genres) ? facts.genres ?? media.genres : media.genres,
    rating: isBlank(media.rating) ? facts.rating ?? media.rating : media.rating,
    posterPath: posterUnusable ? facts.posterPath ?? media.posterPath : media.posterPath,
  }

  const before = media as unknown as Record<string, unknown>
  const filled = (Object.keys(facts) as Array<keyof TmdbFacts>).filter(
    (k) => k !== 'title' && isBlank(before[k]) && !isBlank(facts[k])
  )
  if (filled.length > 0) {
    logger.info(
      `[NotifV2][enrichMedia] ${media.mediaType}/${tmdbId} complété depuis TMDB : ${filled.join(', ')}`
    )
  }

  return enriched
}
