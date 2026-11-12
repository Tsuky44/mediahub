import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { episodeBatches, mediaRequests } from '@/lib/db/schema'
import { forget } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { getManagerKind, type ManagerKind } from '@/lib/download-managers'
import { getSorraaService, toSorraaKind } from '@/lib/services/sorraa'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService, type SonarrService } from '@/lib/services/sonarr'
import { pruneSeasonFromRequest } from '@/lib/services/media-forget-seasons'

/**
 * Oublier un titre qu'on supprime du disque : le gestionnaire (sorraa ou Radarr/Sonarr) ne le
 * cherche plus, sinon il le retelechargerait aussitot, et ses demandes disparaissent. Sert au
 * gestionnaire de stockage de MediaHub comme a celui d'Onyx, qui supprime lui-meme les fichiers.
 */

export interface ForgetInput {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  /** Une saison seulement : la serie reste suivie, sans elle. */
  season?: number
  /** Laisser le gestionnaire effacer les fichiers (Emby) ; Onyx les efface lui-meme. */
  deleteFiles: boolean
  /** Identifiant TVDB quand Emby le donne : Sonarr retrouve la serie par lui d'abord. */
  tvdbId?: number
  /** Ne toucher qu'aux demandes (le gestionnaire est laisse tel quel). */
  skipManager?: boolean
}

export interface ForgetOutcome {
  manager: ManagerKind
  /** Le titre etait chez le gestionnaire et n'y est plus (ou plus pour cette saison). */
  managerRemoved: boolean
  requestsRemoved: number
}

/** Une erreur du gestionnaire : rien ne doit etre supprime du disque apres elle. */
export class ForgetError extends Error {
  constructor(message: string, readonly manager: ManagerKind) {
    super(message)
  }
}

export async function forgetMedia(input: ForgetInput): Promise<ForgetOutcome> {
  const manager = await getManagerKind(input.mediaType)
  const managerRemoved = input.skipManager ? false : await removeFromManager(manager, input)
  // Emby ne donne pas toujours le TMDB d'une saison : sans lui, pas de demande a retrouver.
  const requestsRemoved = input.tmdbId > 0 ? await removeRequests(input) : 0
  if (input.tmdbId > 0) forget(`media_availability_${input.mediaType}_${input.tmdbId}`)
  return { manager, managerRemoved, requestsRemoved }
}

async function removeFromManager(manager: ManagerKind, input: ForgetInput): Promise<boolean> {
  const { tmdbId, mediaType, season, deleteFiles } = input
  if (manager === 'sorraa') {
    const sorraa = await getSorraaService()
    if (!sorraa) return false
    try {
      const media = await sorraa.findMedia(toSorraaKind(mediaType), tmdbId)
      if (!media) return false
      if (season !== undefined) await sorraa.removeSeason(media.id, season, { deleteFiles })
      else await sorraa.removeMedia(media.id, { deleteFiles })
      return true
    } catch (e) {
      throw new ForgetError(`sorraa n’a pas retiré le titre : ${(e as Error).message}`, manager)
    }
  }

  if (mediaType === 'movie') {
    const radarr = await getRadarrService()
    if (!radarr) return false
    const movie = await radarr.getLibraryMovieByTmdbId(tmdbId).catch((e: Error) => {
      throw new ForgetError(`Radarr injoignable, rien n’a été supprimé : ${e.message}`, manager)
    })
    if (!movie?.id) return false
    const result = await radarr.deleteMovie(movie.id, deleteFiles)
    if (!result.success) throw new ForgetError(`Radarr n’a pas retiré le film : ${result.message ?? ''}`, manager)
    return true
  }

  const sonarr = await getSonarrService()
  if (!sonarr) return false
  const series = await findSonarrSeries(sonarr, input.tvdbId, tmdbId)
  if (!series?.id) return false
  if (season === undefined) {
    const result = await sonarr.deleteSeries(series.id, deleteFiles)
    if (!result.success) throw new ForgetError(`Sonarr n’a pas retiré la série : ${result.error ?? ''}`, manager)
    return true
  }
  const result = await sonarr.unmonitorSeason(series.id, season)
  if (!result.success) throw new ForgetError(`Sonarr n’a pas arrêté de suivre la saison ${season} : ${result.error ?? ''}`, manager)
  if (deleteFiles) {
    const files = await sonarr.getEpisodeFiles(series.id)
    for (const file of files.filter(f => f.seasonNumber === season)) await sonarr.deleteEpisodeFile(file.id)
  }
  return true
}

/** Serie Sonarr par TVDB (Emby), sinon par TMDB (Onyx ne connait pas l'id TVDB). */
export async function findSonarrSeries(sonarr: SonarrService, tvdbId?: number, tmdbId?: number) {
  if (tvdbId) return sonarr.getSeriesByTvdbId(tvdbId)
  if (!tmdbId) return null
  const all = await sonarr.getSeries()
  return all.find(s => s.tmdbId === Number(tmdbId)) ?? null
}

async function removeRequests({ tmdbId, mediaType, season }: ForgetInput): Promise<number> {
  const tmdbIdStr = String(tmdbId)
  const rows = await db.query.mediaRequests.findMany({
    where: and(eq(mediaRequests.tmdbId, tmdbIdStr), eq(mediaRequests.mediaType, mediaType)),
  })

  if (season === undefined) {
    if (rows.length > 0) await db.delete(mediaRequests).where(inArray(mediaRequests.id, rows.map(r => r.id)))
    if (mediaType === 'tv' || rows.length > 0) await db.delete(episodeBatches).where(eq(episodeBatches.tmdbId, tmdbIdStr))
    try {
      const { purgeNotifDedupForTmdbId } = await import('@/lib/notifications-v2/bootstrap')
      await purgeNotifDedupForTmdbId(tmdbIdStr)
    } catch (e) {
      // Les cles de deduplication expirent seules : une purge manquee retarde au pire une notification.
      logger.warn('[Forget] Purge des notifications impossible:', (e as Error).message)
    }
    return rows.length
  }

  let removed = 0
  for (const row of rows) {
    const next = pruneSeasonFromRequest(row.metadata, season)
    if (!next.keep) {
      await db.delete(mediaRequests).where(eq(mediaRequests.id, row.id))
      removed++
    } else if (next.metadata !== row.metadata) {
      await db.update(mediaRequests).set({ metadata: next.metadata }).where(eq(mediaRequests.id, row.id))
    }
  }
  await db.delete(episodeBatches).where(and(eq(episodeBatches.tmdbId, tmdbIdStr), eq(episodeBatches.seasonNumber, season)))
  return removed
}
