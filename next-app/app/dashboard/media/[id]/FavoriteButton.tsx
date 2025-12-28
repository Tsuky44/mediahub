'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

interface FavoriteButtonProps {
    embyItemId: string
    initialIsFavorite: boolean
}

export default function FavoriteButton({ embyItemId, initialIsFavorite }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const toggleFavorite = async () => {
        setLoading(true)
        const nextState = !isFavorite
        
        try {
            const res = await fetch('/api/media/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embyItemId, isFavorite: nextState })
            })
            
            if (res.ok) {
                setIsFavorite(nextState)
                router.refresh()
            } else {
                const data = await res.json()
                console.error('Failed to toggle favorite:', data.error)
            }
        } catch (e) {
            console.error('Error toggling favorite:', e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button 
            onClick={toggleFavorite}
            disabled={loading}
            className={clsx(
                "p-2.5 rounded-lg border transition flex items-center justify-center",
                isFavorite 
                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/30" 
                    : "bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
            )}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Star className={clsx("w-5 h-5", isFavorite && "fill-current")} />
            )}
        </button>
    )
}
