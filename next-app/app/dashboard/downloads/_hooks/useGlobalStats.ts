'use client'

import { useQuery } from '@tanstack/react-query'
import { getGlobalStats } from '../actions'

export interface GlobalStats {
    dl_info_speed: number
    up_info_speed: number
    dl_info_data: number
    up_info_data: number
    alltime_dl: number
    alltime_ul: number
    free_space_on_disk: number
    global_seeds?: number
    global_leechs?: number
}

const POLL_INTERVAL_MS = 2000
const QUERY_KEY = ['torrents', 'global-stats'] as const

/**
 * TanStack Query-powered global qBittorrent stats.
 * Polling every 2s via refetchInterval.
 */
export function useGlobalStats() {
    const { data: stats, isLoading: loading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const data = await getGlobalStats()
            return data as GlobalStats | null
        },
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: POLL_INTERVAL_MS / 2,
    })

    return { stats, loading }
}
