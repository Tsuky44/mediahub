'use client'

import { useGlobalStats } from '../_hooks/useGlobalStats'
import { TorrentStatsBar } from './torrent-stats/TorrentStatsBar'

/** Affiche la barre de stats globales qBittorrent (vitesse, session, ratio). */
export function TorrentStats() {
    const { stats, loading } = useGlobalStats()

    if (loading || !stats) return null

    return <TorrentStatsBar stats={stats} />
}
