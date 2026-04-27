'use client'

import { RotateCcw } from 'lucide-react'
import { useMediaFilters } from './media-filters/_hooks/useMediaFilters'
import { SortByCard } from './media-filters/SortByCard'
import { DateRangeCard } from './media-filters/DateRangeCard'
import { LanguageCard } from './media-filters/LanguageCard'
import { GenresCard } from './media-filters/GenresCard'
import { StreamingCard } from './media-filters/StreamingCard'
import type {
  MediaFiltersType,
  MediaFiltersValue,
} from './media-filters/_types/media-filters'

interface MediaFiltersProps {
  type: MediaFiltersType
  onFilterChange: (filters: MediaFiltersValue) => void
}

export function MediaFilters({ type, onFilterChange }: MediaFiltersProps) {
  const {
    filters,
    genres,
    providers,
    loadingProviders,
    showAllProviders,
    setShowAllProviders,
    handleChange,
    toggleGenre,
    toggleProvider,
    resetFilters,
  } = useMediaFilters({ type, onFilterChange })

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Configuration des filtres
        </h4>
        <button
          onClick={resetFilters}
          className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-400/10 px-3 py-1.5 rounded-full hover:bg-indigo-400/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser tout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          <SortByCard
            value={filters.sort_by}
            onChange={(value) => handleChange('sort_by', value)}
          />
          <DateRangeCard
            startDate={filters.start_date}
            endDate={filters.end_date}
            onStartDateChange={(value) => handleChange('start_date', value)}
            onEndDateChange={(value) => handleChange('end_date', value)}
          />
          <LanguageCard
            value={filters.language}
            onChange={(value) => handleChange('language', value)}
          />
        </div>

        <GenresCard
          genres={genres}
          selected={filters.genres}
          onToggle={toggleGenre}
        />

        <StreamingCard
          region={filters.watch_region}
          onRegionChange={(value) => handleChange('watch_region', value)}
          providers={providers}
          loadingProviders={loadingProviders}
          selectedProviders={filters.watch_providers}
          onToggleProvider={toggleProvider}
          showAllProviders={showAllProviders}
          onToggleShowAllProviders={() =>
            setShowAllProviders(!showAllProviders)
          }
        />
      </div>
    </div>
  )
}
