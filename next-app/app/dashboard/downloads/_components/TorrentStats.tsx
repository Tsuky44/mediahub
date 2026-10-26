'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useGlobalStats } from '../_hooks/useGlobalStats'
import { TorrentStatsBar } from './torrent-stats/TorrentStatsBar'

// Modal (graphiques recharts) chargée seulement au premier clic
const TrackerStatsModal = dynamic(
    () => import('./torrent-stats/TrackerStatsModal').then(mod => mod.TrackerStatsModal),
    { ssr: false }
)

/**
 * Affiche la barre de stats globales qBittorrent (vitesse, session, ratio)
 * et la modal detaillee par tracker (session/historique) accessible au clic
 * sur la carte Session.
 */
export function TorrentStats() {
    const { stats, loading } = useGlobalStats()
    const [isModalOpen, setIsModalOpen] = useState(false)
    // Une fois ouverte, la modal reste montée (conserve son état comme avant)
    const [hasOpenedModal, setHasOpenedModal] = useState(false)

    if (loading || !stats) return null

    return (
        <>
            <TorrentStatsBar
                stats={stats}
                onOpenSessionModal={() => {
                    setHasOpenedModal(true)
                    setIsModalOpen(true)
                }}
            />
            {hasOpenedModal && (
                <TrackerStatsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    )
}
