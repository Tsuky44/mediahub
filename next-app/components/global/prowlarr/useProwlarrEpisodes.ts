'use client'

import { useQuery } from '@tanstack/react-query'
import { getSonarrEpisodes } from '@/app/dashboard/media/[id]/prowlarr-actions'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'
import type { ProwlarrEpisode } from './prowlarr-types'

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
                const seasonEpisodes = sonarrRes.episodes
                    .filter((e: any) => e.seasonNumber === selectedSeason)
                    .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
                if (seasonEpisodes.length > 0) {
                    return seasonEpisodes.map((e: any) => ({
                        id: e.id,
                        episode_number: e.episodeNumber,
                        name: e.title,
                        overview: e.overview,
                        hasFile: e.hasFile,
                    })) as ProwlarrEpisode[]
                }
            }

            const tmdbData = await getSeasonDetails(tmdbId, selectedSeason)
            if ((tmdbData as any)?.episodes) {
                return (tmdbData as any).episodes as ProwlarrEpisode[]
            }
            return []
        },
        enabled: mediaType === 'tv' && !!tmdbId && selectedSeason !== null,
        staleTime: Infinity,
    })

    return { episodes, loading }
}
