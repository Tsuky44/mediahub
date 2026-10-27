'use client'

import { Heart, Clock } from 'lucide-react'

interface MediaFilterPillsProps {
  currentType: string
  query?: string
  isFavoritesOnly: boolean
  isWatchLaterOnly: boolean
}

export function MediaFilterPills({ currentType, query, isFavoritesOnly, isWatchLaterOnly }: MediaFilterPillsProps) {
  return (
    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
      <a
        href={`?type=${currentType}${query ? `&q=${query}` : ''}&favorites=${!isFavoritesOnly}${isWatchLaterOnly ? '&watchLater=true' : ''}`}
        className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-md whitespace-nowrap ${
          isFavoritesOnly
            ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/30'
            : 'bg-gray-900/40 border-white/10 text-gray-400 hover:bg-gray-800/60 hover:text-white hover:border-white/20'
        }`}
      >
        <Heart className={`w-4 h-4 transition-transform duration-300 ${isFavoritesOnly ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
        <span>Favoris</span>
      </a>

      <a
        href={`?type=${currentType}${query ? `&q=${query}` : ''}&watchLater=${!isWatchLaterOnly}${isFavoritesOnly ? '&favorites=true' : ''}`}
        className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-md whitespace-nowrap ${
          isWatchLaterOnly
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(232,230,228,0.08)] hover:bg-blue-500/30'
            : 'bg-gray-900/40 border-white/10 text-gray-400 hover:bg-gray-800/60 hover:text-white hover:border-white/20'
        }`}
      >
        <Clock className={`w-4 h-4 transition-transform duration-300 ${isWatchLaterOnly ? 'fill-current scale-110' : 'group-hover:scale-110'}`} />
        <span>À regarder</span>
      </a>
    </div>
  )
}
