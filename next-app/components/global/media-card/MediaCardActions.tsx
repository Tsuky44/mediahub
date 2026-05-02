'use client'

import { Tv, Heart } from 'lucide-react'

interface MediaCardActionsProps {
  isWatchLater: boolean
  isTogglingWatchLater: boolean
  isFavorite: boolean
  isTogglingFavorite: boolean
  showFavoriteButton: boolean
  onToggleWatchLater: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
}

function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
}

export function MediaCardActions({
  isWatchLater,
  isTogglingWatchLater,
  isFavorite,
  isTogglingFavorite,
  showFavoriteButton,
  onToggleWatchLater,
  onToggleFavorite,
}: MediaCardActionsProps) {
  return (
    <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-30 pointer-events-none group-hover:pointer-events-auto">
      <button
        onClick={onToggleWatchLater}
        disabled={isTogglingWatchLater}
        className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 border ${
          isWatchLater
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
            : 'bg-gray-900/60 border-white/10 text-gray-400 hover:bg-gray-800/80 hover:text-white hover:border-white/20'
        }`}
        title={isWatchLater ? 'Retirer de la liste' : 'À regarder plus tard'}
      >
        {isTogglingWatchLater ? <Spinner /> : <Tv className={`w-4 h-4 ${isWatchLater ? 'fill-current' : ''}`} />}
      </button>

      {showFavoriteButton && (
        <button
          onClick={onToggleFavorite}
          disabled={isTogglingFavorite}
          className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 border ${
            isFavorite
              ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              : 'bg-gray-900/60 border-white/10 text-gray-400 hover:bg-gray-800/80 hover:text-white hover:border-white/20'
          }`}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isTogglingFavorite ? (
            <Spinner />
          ) : (
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          )}
        </button>
      )}
    </div>
  )
}
