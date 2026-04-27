'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Film, Tv, Check, Clock, Heart } from 'lucide-react'
import { toggleFavorite } from '@/app/dashboard/media/actions'
import { toggleWatchLater } from '@/app/dashboard/media/watch-later-actions'
import { useState } from 'react'

export interface MediaItem {
  id: string | number
  title?: string
  name?: string
  poster_path: string | null
  media_type?: string
  overview?: string
  media_status?: {
      available: boolean
      status: string
      message: string
  }
  tmdbId?: string | number
  isFavorite?: boolean
  isWatchLater?: boolean
}

export function MediaCard({ item, showFavoriteButton = false }: { item: MediaItem, showFavoriteButton?: boolean }) {
  const [isFavorite, setIsFavorite] = useState(item.isFavorite)
  const [isWatchLater, setIsWatchLater] = useState(item.isWatchLater)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isTogglingWatchLater, setIsTogglingWatchLater] = useState(false)
  const title = item.title || item.name || 'Untitled'
  
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isTogglingFavorite) return

    setIsTogglingFavorite(true)
    const newStatus = !isFavorite
    const success = await toggleFavorite(item.id.toString(), newStatus)
    if (success) {
      setIsFavorite(newStatus)
    }
    setIsTogglingFavorite(false)
  }

  const handleToggleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('[MediaCard] Clicked watch later for:', title)
    if (isTogglingWatchLater) return

    setIsTogglingWatchLater(true)
    try {
        const res = await toggleWatchLater({
            mediaId: item.id.toString(),
            tmdbId: item.tmdbId?.toString() || item.id.toString(),
            mediaType: (item.media_type as 'movie' | 'tv') || 'movie',
            title: title,
            posterPath: item.poster_path,
            isEmbyItem: !!item.tmdbId
        })
        
        console.log('[MediaCard] Toggle result:', res)
        if (res.success) {
            setIsWatchLater(res.action === 'added')
        } else {
            alert(`Erreur: ${res.error || 'Une erreur est survenue'}`)
        }
    } catch (err) {
        console.error('[MediaCard] Toggle error:', err)
    } finally {
        setIsTogglingWatchLater(false)
    }
  }

  // Use TMDB ID for linking if available, otherwise fallback to item.id (which might be Emby ID)
  // If item has tmdbId property (from Emby mapping), use it.
  // Otherwise use item.id (standard TMDB result).
  const linkId = item.tmdbId || item.id

  let posterUrl = '/placeholder.png'
  if (item.poster_path) {
      if (item.poster_path.startsWith('http') || item.poster_path.startsWith('/api')) {
          posterUrl = item.poster_path
      } else {
          posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path.startsWith('/') ? '' : '/'}${item.poster_path}`
      }
  }

  const getStatusIndicator = () => {
      if (!item.media_status || item.media_status.status === 'not_available' || item.media_status.status === 'unknown') return null

      const status = item.media_status.status
      let colorClass = ''
      
      if (status === 'available') {
          colorClass = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
      } else if (status === 'partial') {
          colorClass = 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
      } else if (status === 'pending' || status === 'processing') {
          colorClass = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]'
      } else {
          return null
      }

      return (
          <div 
              className={`absolute top-2 right-2 h-3 w-3 rounded-full ${colorClass} z-20`}
              title={item.media_status.message}
          />
      )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:z-10 ring-1 ring-white/5 hover:ring-white/20">
      <Link href={`/dashboard/media/${linkId}?type=${item.media_type || 'movie'}`} className="block h-full w-full">
        <div className="aspect-[2/3] w-full overflow-hidden bg-gray-800 relative">
            {posterUrl ? (
                <img
                    src={posterUrl}
                    alt={title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
            ) : (
                <div className="flex h-full items-center justify-center bg-gray-800 text-gray-600">
                    <Film className="h-12 w-12 opacity-20" />
                </div>
            )}
            
            {/* Status Indicator (Dot) */}
            {getStatusIndicator()}

            {/* Gradient Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-5">
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                    {title}
                </h3>
                
                {/* Meta info row */}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-300 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0 delay-75">
                   {item.media_type === 'tv' ? (
                        <span className="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium text-[10px]">Série</span>
                   ) : (
                        <span className="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium text-[10px]">Film</span>
                   )}
                   {/* We could add year or rating here if available in item props later */}
                </div>

                {/* Overview Preview */}
                {item.overview && (
                    <p className="mt-2 text-xs text-gray-300 line-clamp-3 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0 delay-100 opacity-80 leading-relaxed">
                        {item.overview}
                    </p>
                )}
            </div>
        </div>
      </Link>

      {/* Action Buttons (Floating on top right/left on hover, separate from Link to avoid navigation) */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-30 pointer-events-none group-hover:pointer-events-auto">
        {/* Watch Later */}
        <button
            onClick={handleToggleWatchLater}
            disabled={isTogglingWatchLater}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 border ${
                isWatchLater 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'bg-gray-900/60 border-white/10 text-gray-400 hover:bg-gray-800/80 hover:text-white hover:border-white/20'
            }`}
            title={isWatchLater ? "Retirer de la liste" : "À regarder plus tard"}
        >
            {isTogglingWatchLater ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
                <Tv className={`w-4 h-4 ${isWatchLater ? 'fill-current' : ''}`} />
            )}
        </button>

        {/* Favorite */}
        {showFavoriteButton && (
            <button
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 border ${
                    isFavorite 
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                        : 'bg-gray-900/60 border-white/10 text-gray-400 hover:bg-gray-800/80 hover:text-white hover:border-white/20'
                }`}
                title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
                {isTogglingFavorite ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                )}
            </button>
        )}
      </div>
    </div>
  )
}
