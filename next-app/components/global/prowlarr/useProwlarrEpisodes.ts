'use client'

import { useQuery } from '@tanstack/react-query'
import { getSonarrEpisodes } from '@/app/dashboard/media/[id]/prowlarr-actions'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'
import type { ProwlarrEpisode } from './prowlarr-types'

interface SonarrEpisode {
    id: number
    seasonNumber: number
    episodeNumber: number
    title: string
    overview?: string
    hasFile: boolean
}

interface SeasonDetailsResponse {
    episodes?: ProwlarrEpisode[]
}

export interface UseProwlarrEpisodesResult {
    episodes: ProwlarrEpisode[]
    loading: boolean
}

/**
 * Charge les episodes d'une saison pour une serie TV en preferant Sonarr,
 * avec fallback TMDB si Sonarr n'a pas encore les donnees.
 * Utilise TanStack Query avec enabled et staleTime Infinity.
 */
export function useProwlarrEpisodes(
    mediaType: 'movie' | 'tv' | undefined,
    tmdbId: number | undefined,
    selectedSeason: number | null,
): UseProwlarrEpisodesResult {
    const {
        data: episodes = [],
        isLoading: loading,
    } = useQuery({
        queryKey: ['prowlarr-episodes', tmdbId, selectedSeason] as const,
        queryFn: async () => {
            if (!tmdbId || selectedSeason === null) return []

            const sonarrRes = await getSonarrEpisodes(tmdbId)
            if (sonarrRes.episodes) {
                const seasonEpisodes = (sonarrRes.episodes as SonarrEpisode[])
                    .filter(e => e.seasonNumber === selectedSeason)
                    .sort((a, b) => a.episodeNumber - b.episodeNumber)
                if (seasonEpisodes.length > 0) {
                    return seasonEpisodes.map(e => ({
                        id: e.id,
                        episode_number: e.episodeNumber,
                        name: e.title,
                        overview: e.overview,
                        hasFile: e.hasFile,
                    }))
                }
            }

            const tmdbData = await getSeasonDetails(tmdbId, selectedSeason) as SeasonDetailsResponse
            if (tmdbData.episodes) {
                return tmdbData.episodes
            }
            return []
        },
        enabled: mediaType === 'tv' && !!tmdbId && selectedSeason !== null,
        staleTime: Infinity,
    })

    return { episodes, loading }
}
