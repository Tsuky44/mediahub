'use client'

import type { VisibleColumns } from './TorrentRow'
import { StatusFilterRow } from './StatusFilterRow'
import { SortDropdown } from './SortDropdown'
import { ColumnsDropdown } from './ColumnsDropdown'
import { TorrentActionBar } from './TorrentActionBar'
import { Search } from 'lucide-react'

interface TorrentFiltersBarProps {
  filter: string
  onFilterChange: (id: string) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  sortBy: string
  onSortByChange: (id: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (value: 'asc' | 'desc') => void
  visibleColumns: VisibleColumns
  onToggleColumn: (id: string) => void
  selectedCount: number
  filteredCount: number
  onSelectAll: () => void
  selectedTagsCount: number
  selectedTrackersCount: number
  dateFrom: string
  onOpenFilterModal: () => void
  canAdd: boolean
  onOpenAddModal: () => void
}

/** Barre d'outils de la liste des torrents. Orchestrateur. */
export function TorrentFiltersBar({
  filter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  visibleColumns,
  onToggleColumn,
  selectedCount,
  filteredCount,
  onSelectAll,
  selectedTagsCount,
  selectedTrackersCount,
  dateFrom,
  onOpenFilterModal,
  canAdd,
  onOpenAddModal,
}: TorrentFiltersBarProps) {
  const activeFiltersCount =
    (selectedTagsCount > 0 ? 1 : 0) +
    (selectedTrackersCount > 0 ? 1 : 0) +
    (dateFrom ? 1 : 0)
  const hasActiveFilters = activeFiltersCount > 0
  const isAllSelected = selectedCount > 0 && selectedCount === filteredCount

  return (
    <div className="flex flex-col gap-4 w-full">
      <StatusFilterRow filter={filter} onFilterChange={onFilterChange} />

      <div className="flex flex-col md:flex-row gap-3 w-full items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Rechercher un torrent..."
            className="w-full pl-9 pr-3 h-11 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all focus:bg-white/10"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <SortDropdown
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={onSortByChange}
            onSortOrderChange={onSortOrderChange}
          />

          <ColumnsDropdown visibleColumns={visibleColumns} onToggleColumn={onToggleColumn} />

          <TorrentActionBar
            selectedCount={selectedCount}
            filteredCount={filteredCount}
            isAllSelected={isAllSelected}
            onSelectAll={onSelectAll}
            activeFiltersCount={activeFiltersCount}
            hasActiveFilters={hasActiveFilters}
            onOpenFilterModal={onOpenFilterModal}
            canAdd={canAdd}
            onOpenAddModal={onOpenAddModal}
          />
        </div>
      </div>
    </div>
  )
}
