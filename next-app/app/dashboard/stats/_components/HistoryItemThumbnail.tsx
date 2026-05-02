'use client'

import { Film, Play } from 'lucide-react'
import { EmbyImage } from '@/components/global/EmbyImage'
import type { ProcessedHistoryItem } from '../_utils/history-formatters'

interface HistoryItemThumbnailProps {
  item: ProcessedHistoryItem
}

export function HistoryItemThumbnail({ item }: HistoryItemThumbnailProps) {
  const { itemId, displayName, isLive, isSeries } = item

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl border shadow-lg group-hover:scale-105 transition-transform duration-300 w-16 h-16 bg-gray-900 ${
      isLive ? 'border-indigo-500/30 shadow-indigo-500/20' : 'border-white/10'
    }`}>
      {itemId ? (
        <EmbyImage
          itemId={itemId}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={displayName}
          itemName={displayName}
          tmdbId={item.tmdbId}
          mediaType={item.mediaType || (isSeries ? 'tv' : 'movie')}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-600">
          <Film className="h-8 w-8 opacity-50" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
        <Play className="h-6 w-6 text-white fill-current drop-shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300 delay-75" />
      </div>
    </div>
  )
}
