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
                "p-3 rounded-full border transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95",
                isWatchLater 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                    : "bg-gray-800/40 border-white/10 text-gray-400 hover:bg-gray-700/60 hover:text-white hover:border-white/20 backdrop-blur-md"
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
