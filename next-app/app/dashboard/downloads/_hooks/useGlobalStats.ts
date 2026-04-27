'use client'

import { useEffect, useState } from 'react'
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

/**
 * Polling toutes les 2 secondes des stats globales qBittorrent.
 * Retourne null pendant le premier chargement.
 */
export function useGlobalStats() {
    const [stats, setStats] = useState<GlobalStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const data = await getGlobalStats()
            if (data) setStats(data as GlobalStats)
            setLoading(false)
        }
        fetchStats()
        const interval = setInterval(fetchStats, POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [])

    return { stats, loading }
}
