'use client'

import { useState, useRef, useEffect } from 'react'
import WatchLaterButton from '../../WatchLaterButton'
import { SubscribeButton } from '../../SubscribeButton'
import FavoriteButton from '../../FavoriteButton'
import { ManageMediaButton } from '../../ManageMediaButton'
import { CalendarButton } from '@/components/global/CalendarButton'
import { SearchActions } from '../SearchActions'
import { ManageMediaModal } from '../../ManageMediaModal'
import type { MediaType } from '../../_types/media-page'
import { MoreHorizontal } from 'lucide-react'

interface MediaActionsRowProps {
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  releaseDate?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embyItem: any | null
  isWatchLaterItem: boolean
  isSubscribed: boolean
  isInCalendar: boolean
  tvdbId?: number
  canManageSettings: boolean
  canTriggerSearch: boolean
  canInteractiveSearch: boolean
}

export default function MediaActionsRow({
  id,
  tmdbId,
  mediaType,
  title,
  releaseDate,
  details,
  embyItem,
  isWatchLaterItem,
  isSubscribed,
  isInCalendar,
  tvdbId,
  canManageSettings,
  canTriggerSearch,
  canInteractiveSearch,
}: MediaActionsRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button - Circle matching the style of other buttons */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 shadow-sm cursor-pointer ${
          isOpen 
            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
            : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'
        }`}
        title="Plus d'actions"
      >
        <MoreHorizontal className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Absolute Floating Drawer */}
      {isOpen && (
        <div className="absolute top-full sm:top-1/2 left-0 sm:left-full mt-3 sm:mt-0 sm:-translate-y-1/2 sm:ml-3 bg-gray-950/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 flex-nowrap whitespace-nowrap animate-in fade-in slide-in-from-top-2 sm:slide-in-from-left-2 duration-200">
          <SubscribeButton
            tmdbId={id}
            mediaType={mediaType}
            title={title}
            initialIsSubscribed={isSubscribed}
          />
          <WatchLaterButton
            mediaId={embyItem ? embyItem.Id : id}
            tmdbId={id}
            mediaType={mediaType}
            title={title}
            posterPath={details.poster_path}
            isEmbyItem={!!embyItem}
            initialIsWatchLater={isWatchLaterItem}
          />
          {embyItem && (
            <FavoriteButton
              embyItemId={embyItem.Id}
              initialIsFavorite={embyItem.UserData?.IsFavorite || false}
              tmdbId={id}
              mediaType={mediaType}
            />
          )}
          <CalendarButton
            tmdbId={tmdbId.toString()}
            mediaType={mediaType}
            title={title}
            releaseDate={releaseDate}
            initialIsInCalendar={isInCalendar}
          />
          {canManageSettings && (
            <ManageMediaButton
              onClick={() => setIsManageModalOpen(true)}
            />
          )}
          {mediaType === 'movie' &&
            (canTriggerSearch || canInteractiveSearch) && (
              <SearchActions
                title={title}
                canTriggerSearch={canTriggerSearch}
                canInteractiveSearch={canInteractiveSearch}
                mediaType={mediaType}
                tmdbId={tmdbId}
                tvdbId={tvdbId}
                seasons={details.seasons}
              />
            )}
        </div>
      )}

      {/* Render ManageMediaModal at the root level so it is not trapped by absolute stacking contexts */}
      <ManageMediaModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
      />
    </div>
  )
}
