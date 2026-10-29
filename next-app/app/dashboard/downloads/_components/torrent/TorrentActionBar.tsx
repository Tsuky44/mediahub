'use client'

import clsx from 'clsx'
import { Plus, CheckCircle, Filter } from 'lucide-react'

interface TorrentActionBarProps {
  selectedCount: number
  filteredCount: number
  isAllSelected: boolean
  onSelectAll: () => void
  activeFiltersCount: number
  hasActiveFilters: boolean
  onOpenFilterModal: () => void
  canAdd: boolean
  onOpenAddModal: () => void
}

export function TorrentActionBar({
  selectedCount,
  filteredCount,
  isAllSelected,
  onSelectAll,
  activeFiltersCount,
  hasActiveFilters,
  onOpenFilterModal,
  canAdd,
  onOpenAddModal,
}: TorrentActionBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 w-full">
      {/* Select All + Filters */}
      <div className="flex gap-2 order-2 md:order-2 w-full md:w-auto">
        <button
          onClick={onSelectAll}
          className={clsx(
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-3 h-11 bg-white/5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
            isAllSelected
              ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
              : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
          )}
          title={selectedCount === filteredCount ? 'Tout désélectionner' : 'Tout sélectionner'}
        >
          <CheckCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Tout</span>
        </button>

        <button
          onClick={onOpenFilterModal}
          className={clsx(
            'flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-11 bg-white/5 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
            hasActiveFilters
              ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
              : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtres avancés</span>
          <span className="sm:hidden">Filtres</span>
          {hasActiveFilters && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-[10px] text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Add Button */}
      <div className="flex gap-2 order-3 md:order-3 w-full md:w-auto">
        {canAdd && (
          <button
            onClick={onOpenAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>
    </div>
  )
}
