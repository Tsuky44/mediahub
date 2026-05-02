'use client'

import Link from 'next/link'
import { Film } from 'lucide-react'
import { useMediaCardActions, type MediaCardItem } from './media-card/useMediaCardActions'
import { getPosterUrl } from './media-card/getPosterUrl'
import { MediaCardStatus } from './media-card/MediaCardStatus'
import { MediaCardOverlay } from './media-card/MediaCardOverlay'
import { MediaCardActions } from './media-card/MediaCardActions'

export interface MediaItem extends MediaCardItem {}

export function MediaCard({ item, showFavoriteButton = false }: { item: MediaItem, showFavoriteButton?: boolean }) {
  const {
    isFavorite,
    isWatchLater,
    isTogglingFavorite,
    isTogglingWatchLater,
    handleToggleFavorite,
    handleToggleWatchLater,
  } = useMediaCardActions(item)

  const title = item.title || item.name || 'Untitled'
  const linkId = item.tmdbId || item.id
  const posterUrl = getPosterUrl(item.poster_path)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-gray-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:z-10 ring-1 ring-white/5 hover:ring-white/20">
      <Link href={`/dashboard/media/${linkId}?type=${item.media_type || 'movie'}`} className="block h-full w-full">
        <div className="aspect-[2/3] w-full overflow-hidden bg-gray-800 relative">
          {posterUrl !== '/placeholder.png' ? (
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

          <MediaCardStatus status={item.media_status?.status} message={item.media_status?.message} />
          <MediaCardOverlay title={title} mediaType={item.media_type} overview={item.overview} />
        </div>
      </Link>

      <MediaCardActions
        isWatchLater={isWatchLater}
        isTogglingWatchLater={isTogglingWatchLater}
        isFavorite={isFavorite}
        isTogglingFavorite={isTogglingFavorite}
        showFavoriteButton={showFavoriteButton}
        onToggleWatchLater={handleToggleWatchLater}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  )
}
