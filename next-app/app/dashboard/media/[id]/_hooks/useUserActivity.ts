'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface SeasonStat {
    seasonNumber: number
    total: number
    played: number
    percentage: number
}

export interface ViewingStat {
    userId: string
    userName: string
    played: boolean
    lastPlayedDate: string | null
    playbackPositionTicks: number
    totalDurationTicks: number
    percentage: number
    episodeText?: string
    seasons?: SeasonStat[]
    playedEpisodes?: number
    totalEpisodes?: number
}

export interface SeasonDetail {
    id: string
    name: string
    index: number
    size: number
    episodesCount: number
    path: string
}

export interface ItemDetails {
    viewingStats: ViewingStat[]
    seasons: SeasonDetail[]
}

const QUERY_KEY = (tmdbId: number, mediaType: 'movie' | 'tv') =>
    ['user-activity', tmdbId, mediaType] as const

export interface UseUserActivityResult {
    isOpen: boolean
    setIsOpen: (v: boolean) => void
    loading: boolean
    details: ItemDetails | null
    error: string | null
    handleOpen: () => void
    formatBytes: (bytes: number, decimals?: number) => string
}

export function useUserActivity(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
): UseUserActivityResult {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)

    const {
        data: details,
        isLoading: loading,
        error: queryError,
    } = useQuery({
        queryKey: QUERY_KEY(tmdbId, mediaType),
        queryFn: async () => {
            const type = mediaType === 'movie' ? 'Movie' : 'Series'
            const res = await fetch(`/api/admin/storage/details?tmdbId=${tmdbId}&type=${type}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error('Média non trouvé dans le stockage')
                if (res.status === 401) throw new Error('Non autorisé')
                throw new Error('Erreur lors du chargement des détails')
            }
            return res.json() as Promise<ItemDetails>
        },
        enabled: isOpen,
    })

    const errorMessage = queryError instanceof Error ? queryError.message : null

    const handleOpen = useCallback(() => {
        setIsOpen(true)
        queryClient.invalidateQueries({ queryKey: QUERY_KEY(tmdbId, mediaType) })
    }, [queryClient, tmdbId, mediaType])

    const formatBytes = useCallback((bytes: number, decimals = 2) => {
        if (!bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }, [])

    return {
        isOpen,
        setIsOpen,
        loading,
        details: details ?? null,
        error: errorMessage,
        handleOpen,
        formatBytes,
    }
}
