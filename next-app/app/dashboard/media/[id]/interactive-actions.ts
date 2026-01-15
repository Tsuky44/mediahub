'use server'

import { getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'

export async function searchReleases(tmdbId: number, mediaType: 'movie' | 'tv', episodeId?: number, seasonNumber?: number) {
  try {
    if (mediaType === 'movie') {
      const radarrService = await getRadarrServiceForUser()
      if (!radarrService) return { error: 'Radarr not configured' }

      const movie = await radarrService.getMovieByTmdbId(tmdbId)
      if (!movie || !movie.id) return { error: 'Movie not found in Radarr' }

      const releases = await radarrService.getReleases(movie.id)
      return { releases }
    } else {
      const sonarrService = await getSonarrServiceForUser()
      if (!sonarrService) return { error: 'Sonarr not configured' }

      if (seasonNumber !== undefined) {
          const tmdbService = await getTmdbServiceForUser()
          if (!tmdbService) return { error: 'TMDB service not configured' }

          const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
          if (!externalIds?.tvdb_id) return { error: 'TVDB ID not found' }

          const series = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
          if (!series || !series.id) return { error: 'Series not found in Sonarr' }

          const releases = await sonarrService.getSeasonReleases(series.id, seasonNumber)
          return { releases }
      }

      if (!episodeId) return { error: 'Episode ID or Season Number required for series' }

      const releases = await sonarrService.getReleases(episodeId)
      return { releases }
    }
  } catch (error: any) {
    console.error('Search releases error:', error)
    return { error: error.message }
  }
}

export async function downloadRelease(mediaType: 'movie' | 'tv', guid: string, indexerId: number) {
  try {
    if (mediaType === 'movie') {
      const radarrService = await getRadarrServiceForUser()
      if (!radarrService) return { error: 'Radarr not configured' }

      const result = await radarrService.downloadRelease(guid, indexerId)
      if (!result.success) return { error: result.message }
      return { success: true }
    } else {
      const sonarrService = await getSonarrServiceForUser()
      if (!sonarrService) return { error: 'Sonarr not configured' }

      const result = await sonarrService.downloadRelease(guid, indexerId)
      if (!result.success) return { error: result.message }
      return { success: true }
    }
  } catch (error: any) {
    console.error('Download release error:', error)
    return { error: error.message }
  }
}

export async function getSeriesEpisodes(tmdbId: number) {
  try {
    const sonarrService = await getSonarrServiceForUser()
    const tmdbService = await getTmdbServiceForUser()
    if (!sonarrService || !tmdbService) return { error: 'Services not configured' }

    // Convert TMDB to TVDB
    const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
    if (!externalIds?.tvdb_id) return { error: 'TVDB ID not found' }

    const series = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
    if (!series || !series.id) return { error: 'Series not found in Sonarr' }

    const episodes = await sonarrService.getEpisodes(series.id)
    return { episodes }
  } catch (error: any) {
    console.error('Get episodes error:', error)
    return { error: error.message }
  }
}
