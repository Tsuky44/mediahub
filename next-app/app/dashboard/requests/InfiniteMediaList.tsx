'use client'

import { useInfiniteMedia } from './_components/infinite-media/useInfiniteMedia'
import { FilterModal } from './_components/infinite-media/FilterModal'
import { MediaTypeTabs } from './_components/infinite-media/MediaTypeTabs'
import {
  MediaGrid,
  MediaGridLoading,
  MediaGridMoreLoading,
  MediaGridEmpty,
  InfiniteScrollTrigger,
} from './_components/infinite-media/MediaGrid'
import { SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { MediaFiltersValue } from '@/components/global/media-filters/_types/media-filters'

interface InfiniteMediaListProps {
  initialItems: any[]
  initialType: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' | 'trends'
  initialSearch?: string
  initialFilters?: Partial<MediaFiltersValue>
  showTabs?: boolean
}

export function InfiniteMediaList({
  initialItems,
  initialType,
  initialSearch,
  initialFilters,
  showTabs = true,
}: InfiniteMediaListProps) {
  const {
    items,
    loading,
    isPending,
    hasMore,
    showFilters,
    setShowFilters,
    handleFilterChange,
    onSideFilterChange,
    activeFilters,
    ref,
  } = useInfiniteMedia(initialItems, initialType, initialSearch, initialFilters)

  // Bouton flottant rendu directement dans <body> : aucun conteneur de la page ne
  // peut le déplacer (il reste collé au coin de l'écran pendant le défilement)
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false)

  const filterType =
    initialType === 'watch-later' || initialType === 'recommendations' || initialType === 'trends'
      ? 'all'
      : initialType

  return (
    <div className="flex flex-col gap-6 items-start relative">
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        type={filterType}
        onFilterChange={onSideFilterChange}
        activeFilters={activeFilters}
      />

      {isClient && createPortal(
        <button
          onClick={() => setShowFilters(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 hover:scale-110 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/30 group"
          title="Ouvrir les filtres"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
        </button>,
        document.body
      )}

      <div
        className={clsx(
          'flex-1 space-y-6 w-full transition-opacity duration-300',
          isPending && 'opacity-50 pointer-events-none'
        )}
      >
        <MediaTypeTabs
          activeType={initialType}
          isPending={isPending}
          onChange={handleFilterChange}
          showTabs={showTabs}
        />

        <MediaGrid items={items} loading={loading} hasMore={hasMore} initialType={initialType} triggerRef={ref} />

        {loading && items.length === 0 && <MediaGridLoading />}
        {!loading && hasMore && <InfiniteScrollTrigger triggerRef={ref} />}
        {loading && items.length > 0 && <MediaGridMoreLoading />}
        {!loading && items.length === 0 && <MediaGridEmpty />}
      </div>
    </div>
  )
}
