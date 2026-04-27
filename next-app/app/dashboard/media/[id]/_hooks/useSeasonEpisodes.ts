'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'
import type { Episode } from '../_types/season'

export interface UseSeasonEpisodesResult {
    isOpen: boolean
    episodes: Episode[]
    loading: boolean
    loaded: boolean
    error: boolean
    toggleOpen: () => Promise<void>
}

/**
 * Gere le toggle d'une saison (accordion) et charge ses episodes a la demande
 * via TMDB la premiere fois (puis cache local).
 */
export function useSeasonEpisodes(
    tvId: number,
    seasonNumber: number,
    initiallyOpen: boolean,
): UseSeasonEpisodesResult {
    const [isOpen, setIsOpen] = useState(initiallyOpen)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    const loadEpisodes = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const data = await getSeasonDetails(tvId, seasonNumber)
            if (data && data.episodes) {
                setEpisodes(data.episodes)
                setLoaded(true)
            } else {
                setError(true)
            }
        } catch (err) {
            console.error('Failed to load episodes', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [tvId, seasonNumber])

    useEffect(() => {
        if (initiallyOpen && !loaded && !loading) {
            loadEpisodes()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initiallyOpen])

    const toggleOpen = useCallback(async () => {
        if (isOpen) {
            setIsOpen(false)
            return
        }
        setIsOpen(true)
        if (!loaded) await loadEpisodes()
    }, [isOpen, loaded, loadEpisodes])

    return { isOpen, episodes, loading, loaded, error, toggleOpen }
}
