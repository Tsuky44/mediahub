'use client'

import { useEffect, useState } from 'react'
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
 */
export function useProwlarrEpisodes(
    mediaType: 'movie' | 'tv' | undefined,
    tmdbId: number | undefined,
    selectedSeason: number | null,
): UseProwlarrEpisodesResult {
    const [episodes, setEpisodes] = useState<ProwlarrEpisode[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (mediaType !== 'tv' || !tmdbId || selectedSeason === null) {
            setEpisodes([])
            return
        }

        let cancelled = false
        setLoading(true)

        getSonarrEpisodes(tmdbId)
            .then(res => {
                if (cancelled) return null
                if (res.episodes) {
                    const seasonEpisodes = res.episodes
                        .filter((e: any) => e.seasonNumber === selectedSeason)
                        .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
                    if (seasonEpisodes.length > 0) {
                        setEpisodes(seasonEpisodes.map((e: any) => ({
                            id: e.id,
                            episode_number: e.episodeNumber,
                            name: e.title,
                            overview: e.overview,
                            hasFile: e.hasFile,
                        })))
                        return null
                    }
                }
                return getSeasonDetails(tmdbId, selectedSeason)
            })
            .then(data => {
                if (cancelled || !data) return
                if ((data as any).episodes) {
                    setEpisodes((data as any).episodes)
                } else {
                    setEpisodes([])
                }
            })
            .catch(err => {
                if (cancelled) return
                console.error('Error fetching episodes:', err)
                setEpisodes([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [mediaType, tmdbId, selectedSeason])

    return { episodes, loading }
}
