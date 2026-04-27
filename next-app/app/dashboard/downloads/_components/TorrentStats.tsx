'use client'

import { useState } from 'react'
import { useGlobalStats } from '../_hooks/useGlobalStats'
import { TorrentStatsBar } from './torrent-stats/TorrentStatsBar'
import { TrackerStatsModal } from './torrent-stats/TrackerStatsModal'

/**
 * Affiche la barre de stats globales qBittorrent (vitesse, session, ratio)
 * et la modal detaillee par tracker (session/historique) accessible au clic
 * sur la carte Session.
 */
export function TorrentStats() {
    const { stats, loading } = useGlobalStats()
    const [isModalOpen, setIsModalOpen] = useState(false)

    if (loading || !stats) return null

    return (
        <>
            <TorrentStatsBar stats={stats} onOpenSessionModal={() => setIsModalOpen(true)} />
            <TrackerStatsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    )
}
