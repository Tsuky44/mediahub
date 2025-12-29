'use client'

import { Tv, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toggleWatchLater } from '@/app/dashboard/media/watch-later-actions'
import clsx from 'clsx'

interface WatchLaterButtonProps {
    mediaId: string
    tmdbId: string
    mediaType: 'movie' | 'tv'
    title: string
    posterPath: string | null
    isEmbyItem: boolean
    initialIsWatchLater: boolean
}

export default function WatchLaterButton({
    mediaId,
    tmdbId,
    mediaType,
    title,
    posterPath,
    isEmbyItem,
    initialIsWatchLater
}: WatchLaterButtonProps) {
    const [isWatchLater, setIsWatchLater] = useState(initialIsWatchLater)
    const [loading, setLoading] = useState(false)

    const handleToggle = async () => {
        if (loading) return
        setLoading(true)
        
        try {
            const res = await toggleWatchLater({
                mediaId,
                tmdbId,
                mediaType,
                title,
                posterPath,
                isEmbyItem
            })

            if (res.success) {
                setIsWatchLater(res.action === 'added')
            } else {
                alert(`Erreur: ${res.error || 'Une erreur est survenue'}`)
            }
        } catch (err) {
            console.error('[WatchLaterButton] Toggle error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button 
            onClick={handleToggle}
            disabled={loading}
            className={clsx(
                "p-2.5 rounded-lg border transition flex items-center justify-center",
                isWatchLater 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-500 hover:bg-blue-500/30" 
                    : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
            )}
            title={isWatchLater ? "Retirer de À regarder plus tard" : "Ajouter à À regarder plus tard"}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Tv className="w-5 h-5" />
            )}
        </button>
    )
}
