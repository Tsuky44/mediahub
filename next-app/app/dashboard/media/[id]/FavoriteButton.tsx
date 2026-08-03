'use client'

import { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { toggleFavorite as toggleFavoriteAction } from '@/app/dashboard/media/actions'
import { useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'

interface FavoriteButtonProps {
    embyItemId: string
    initialIsFavorite: boolean
    tmdbId?: string
    mediaType?: 'movie' | 'tv'
}

export default function FavoriteButton({ embyItemId, initialIsFavorite, tmdbId, mediaType }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const serverType = useMediaServerType()
    const serverName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby'

    const handleToggle = async () => {
        setLoading(true)
        const nextState = !isFavorite
        
        try {
            // If we don't have a real embyItemId (it's the tmdbId from fallback), 
            // the action will fail if Emby doesn't know the item yet.
            // But this is consistent with how the UI works.
            const success = await toggleFavoriteAction(embyItemId, nextState)
            
            if (success) {
                setIsFavorite(nextState)
                router.refresh()
            } else {
                // If it fails, maybe the item isn't on Emby yet
                alert(`Impossible de mettre en favori : ce média n'est pas encore disponible sur votre serveur ${serverName}.`)
            }
        } catch (e) {
            console.error('Error toggling favorite:', e)
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
                isFavorite 
                    ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "bg-gray-800/40 border-white/10 text-gray-400 hover:bg-gray-700/60 hover:text-white hover:border-white/20 backdrop-blur-md"
            )}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Heart className={clsx("w-5 h-5", isFavorite && "fill-current")} />
            )}
        </button>
    )
}
