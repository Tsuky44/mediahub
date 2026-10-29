import { prisma } from '@/lib/prisma'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'
import type { AddRequestInput, AddRequestOutcome, DownloadManager } from './types'

/** Radarr (films) et Sonarr (series) : comportement historique. */
export class ArrDownloadManager implements DownloadManager {
  readonly kind = 'arr' as const

  async addRequest({ tmdbId, mediaType, title, seasons }: AddRequestInput): Promise<AddRequestOutcome> {
    if (mediaType === 'movie') {
      const radarrService = await getRadarrService()
      if (!radarrService) return { ok: false, status: 503, error: 'Radarr not configured' }

      const profiles = await radarrService.getProfiles()
      const rootFolders = await radarrService.getRootFolders()
      if (!profiles.length || !rootFolders.length) {
        return { ok: false, status: 500, error: 'Radarr configuration incomplete (profiles/root folders missing)' }
      }

      const addResult = await radarrService.addMovie({
        tmdbId,
        title: title || 'Unknown',
        qualityProfileId: profiles[0].id,
        rootFolderPath: rootFolders[0].path,
        year: 0, // Radarr lookup will fill this
        minimumAvailability: 'announced',
        monitored: true,
        searchNow: true,
      })
      if (!addResult.success) return { ok: false, status: 500, error: addResult.message ?? 'Unknown error' }
      return {
        ok: true,
        message: addResult.message,
        data: addResult.movie,
        externalId: addResult.movie?.id ? addResult.movie.id.toString() : undefined,
      }
    }

    const sonarrService = await getSonarrService()
    const tmdbService = await getTmdbService()
    if (!sonarrService || !tmdbService) return { ok: false, status: 503, error: 'Sonarr or TMDB not configured' }

    const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
    if (!externalIds || !externalIds.tvdb_id) {
      return { ok: false, status: 404, error: 'Could not find TVDB ID for this series' }
    }
    const tvdbId = externalIds.tvdb_id

    const profiles = await sonarrService.getProfiles()
    const rootFolders = await sonarrService.getRootFolders()
    const languageProfiles = await sonarrService.getLanguageProfiles()
    if (!profiles.length || !rootFolders.length) {
      return { ok: false, status: 500, error: 'Sonarr configuration incomplete (profiles/root folders missing)' }
    }

    const lookup = await sonarrService.lookupSeriesByTvdbId(tvdbId)
    if (!lookup) return { ok: false, status: 404, error: 'Series not found in Sonarr lookup' }
    const allSeasons = lookup.seasons.map((s: { seasonNumber: number }) => s.seasonNumber)

    let seasonsToRequest: number[] = []
    if (seasons && seasons.length > 0) {
      // Garder surveillees les saisons deja demandees (Sonarr remplace la liste)
      const activeRequests = await (prisma as any).mediaRequest.findMany({ where: { tmdbId: tmdbId.toString() } })
      const seasonsFromRequests = new Set<number>(seasons)
      activeRequests.forEach((req: { metadata?: string | null }) => {
        try {
          const metadata = req.metadata ? JSON.parse(req.metadata) as { seasons?: number[] } : {}
          ;(metadata.seasons || []).forEach((s: number) => seasonsFromRequests.add(s))
        } catch (e) {}
      })
      seasonsToRequest = Array.from(seasonsFromRequests)
    } else {
      seasonsToRequest = allSeasons
    }

    const addResult = await sonarrService.addSeries({
      tvdbid: tvdbId,
      title: title || lookup.title,
      qualityProfileId: profiles[0].id,
      rootFolderPath: rootFolders[0].path,
      languageProfileId: languageProfiles?.[0]?.id,
      seasons: seasonsToRequest,
      seasonFolder: true,
      seriesType: 'standard',
      monitored: true,
      searchNow: true,
    })
    if (!addResult.success) return { ok: false, status: 500, error: addResult.message ?? 'Unknown error' }
    return {
      ok: true,
      message: addResult.message,
      data: addResult.series,
      externalId: addResult.series?.id ? addResult.series.id.toString() : undefined,
      allSeasons,
    }
  }

  async getAvailability(tmdbId: number, mediaType: 'movie' | 'tv') {
    const { getArrAvailability } = await import('@/lib/services/media-status')
    return getArrAvailability(tmdbId, mediaType)
  }
}
