'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSeasonDetails } from '@/app/dashboard/media/[id]/actions'
import type { Episode } from '../_types/season'

export interface UseSeasonEpisodesResult {
    isOpen: boolean
    episodes: Episode[]
    loading: boolean
    loaded: boolean
    error: boolean
    toggleOpen: () => void
}

const queryKey = (tvId: number, seasonNumber: number) =>
    ['season-episodes', tvId, seasonNumber] as const

/**
 * TanStack Query-powered season accordion.
 * Episodes are fetched on demand via `enabled` flag and cached indefinitely.
 */
export function useSeasonEpisodes(
    tvId: number,
    seasonNumber: number,
    initiallyOpen: boolean,
): UseSeasonEpisodesResult {
    const [isOpen, setIsOpen] = useState(initiallyOpen)

    const {
        data: episodes = [],
        isLoading: loading,
        isSuccess,
        isError,
    } = useQuery({
        queryKey: queryKey(tvId, seasonNumber),
        queryFn: async () => {
            const data = await getSeasonDetails(tvId, seasonNumber)
            return data?.episodes ?? []
        },
        enabled: isOpen,
        staleTime: Infinity,
    })

    const toggleOpen = () => {
        setIsOpen(prev => !prev)
    }

    return {
        isOpen,
        episodes,
        loading,
        loaded: isSuccess,
        error: isError,
        toggleOpen,
    }
}
