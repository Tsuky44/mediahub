'use client'

import { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { toggleFavorite as toggleFavoriteAction } from '@/app/dashboard/media/actions'

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
                alert("Impossible de mettre en favori : ce média n'est pas encore disponible sur votre serveur Emby.")
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
                "p-2.5 rounded-lg border transition flex items-center justify-center",
                isFavorite 
                    ? "bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30" 
                    : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
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
