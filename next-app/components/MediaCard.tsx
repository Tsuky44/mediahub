'use client'

import Image from 'next/image'
import { Link, Film, Tv, Check, Clock, Heart } from 'lucide-react'
import { toggleFavorite } from '@/app/dashboard/media/actions'
import { toggleWatchLater } from '@/app/dashboard/media/watch-later-actions'
import { useState } from 'react'

interface MediaItem {
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

  const getStatusBadge = () => {
      if (!item.media_status || item.media_status.status === 'not_available' || item.media_status.status === 'unknown') return null

      const status = item.media_status.status
      let colorClass = ''
      let Icon = Check

      if (status === 'available') {
          colorClass = 'bg-green-600'
      } else if (status === 'partial') {
          colorClass = 'bg-purple-600'
      } else if (status === 'pending' || status === 'processing') {
          colorClass = 'bg-yellow-500'
          Icon = status === 'processing' ? Clock : Check // User asked for check but clock might be better? User specifically said "coche jaune" (yellow check). So let's stick to Check for pending too, or maybe just Check for all as requested.
          // "petit coche jaune pour dire que la demande est en pending" -> Yellow check.
      } else {
          return null
      }

      return (
          <div 
              className={`absolute top-2 left-2 rounded-full p-1.5 shadow-lg backdrop-blur-md ${colorClass} text-white z-10`}
              title={item.media_status.message}
          >
              <Icon className="h-4 w-4" strokeWidth={3} />
          </div>
      )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[2/3] w-full overflow-hidden bg-gray-900 relative">
        {item.poster_path ? (
             <img
             src={posterUrl}
             alt={title}
             className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
             loading="lazy"
           />
        ) : (
            <div className="flex h-full items-center justify-center bg-gray-800 text-gray-500">
                No Image
            </div>
        )}
        
        {getStatusBadge()}
        
        {/* Favorite Button */}
        {showFavoriteButton && (
            <button
                onClick={handleToggleFavorite}
                disabled={isTogglingFavorite}
                className={`absolute bottom-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 z-20 ${
                    isFavorite 
                        ? 'bg-red-500 text-white shadow-lg scale-110' 
                        : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60'
                }`}
            >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
        )}

        <button
            onClick={handleToggleWatchLater}
            disabled={isTogglingWatchLater}
            className={`absolute bottom-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 z-20 ${
                isWatchLater 
                    ? 'bg-blue-500 text-white shadow-lg scale-110' 
                    : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60'
            }`}
            title="À regarder plus tard"
        >
            <Tv className="w-4 h-4" />
        </button>
        
        {/* Type Badge */}
        {item.media_type && (
            <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1">
                {item.media_type === 'movie' ? (
                    <>
                        <Film className="h-3 w-3" />
                        <span>Film</span>
                    </>
                ) : (
                    <>
                        <Tv className="h-3 w-3" />
                        <span>Série</span>
                    </>
                )}
            </div>
        )}
       
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-medium text-white">
          <a href={`/dashboard/media/${linkId}?type=${item.media_type || 'movie'}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {title}
          </a>
        </h3>
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{item.overview}</p>
      </div>
    </div>
  )
}
