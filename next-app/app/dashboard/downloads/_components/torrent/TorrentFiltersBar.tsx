'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Plus, Search, ArrowUpDown, LayoutTemplate, CheckCircle, Filter } from 'lucide-react'
import { STATUS_FILTERS, SORT_OPTIONS, COLUMN_OPTIONS } from '../../_constants/torrent-options'
import type { VisibleColumns } from './TorrentRow'

interface TorrentFiltersBarProps {
    // Status filter
    filter: string
    onFilterChange: (id: string) => void

    // Search
    searchQuery: string
    onSearchQueryChange: (value: string) => void

    // Sort
    sortBy: string
    onSortByChange: (id: string) => void
    sortOrder: 'asc' | 'desc'
    onSortOrderChange: (value: 'asc' | 'desc') => void

    // Columns
    visibleColumns: VisibleColumns
    onToggleColumn: (id: string) => void

    // Select all
    selectedCount: number
    filteredCount: number
    onSelectAll: () => void

    // Advanced filters
    selectedTagsCount: number
    selectedTrackersCount: number
    dateFrom: string
    onOpenFilterModal: () => void

    // Add torrent
    canAdd: boolean
    onOpenAddModal: () => void
}

/**
 * Barre d'outils au-dessus de la liste des torrents : categories de statut,
 * recherche, tri, selection de colonnes, selection globale, filtres avances
 * et bouton "Ajouter un torrent".
 */
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
    const [isSortOpen, setIsSortOpen] = useState(false)
    const [isColumnsOpen, setIsColumnsOpen] = useState(false)

    const activeFiltersCount =
        (selectedTagsCount > 0 ? 1 : 0) +
        (selectedTrackersCount > 0 ? 1 : 0) +
        (dateFrom ? 1 : 0)
    const hasActiveFilters = activeFiltersCount > 0
    const isAllSelected = selectedCount > 0 && selectedCount === filteredCount

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Status Categories - Scrollable Row */}
            <div className="w-full overflow-x-auto pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-inner w-max min-w-full sm:min-w-0 sm:w-auto">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => onFilterChange(f.id)}
                            className={clsx(
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2',
                                filter === f.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <f.icon className={clsx('w-3.5 h-3.5', filter === f.id ? 'text-white' : 'text-gray-500 group-hover:text-white')} />
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full">
                {/* Search */}
                <div className="relative flex-1 group order-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        name="search-torrent"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck="false"
                        data-1p-ignore="true"
                        data-lpignore="true"
                        data-form-type="other"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full pl-11 pr-4 h-11 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all focus:bg-white/10 backdrop-blur-sm"
                    />
                </div>

                {/* Controls Row (Sort + Filter) */}
                <div className="flex gap-2 order-2 md:order-2 w-full md:w-auto">
                    {/* Sort Dropdown */}
                    <div className="relative flex-1 md:flex-none z-30">
                        <div className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 h-11 w-full backdrop-blur-md">
                            <button
                                onClick={() => setIsSortOpen(v => !v)}
                                className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-2"
                            >
                                <ArrowUpDown className="h-4 w-4 text-indigo-400" />
                                <span className="font-semibold truncate max-w-[80px] md:max-w-none">{SORT_OPTIONS.find(o => o.id === sortBy)?.label}</span>
                            </button>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <button
                                onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-indigo-400 transition-all"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>

                        {isSortOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-52 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                onSortByChange(option.id)
                                                setIsSortOpen(false)
                                            }}
                                            className={clsx(
                                                'w-full text-left px-4 py-2.5 text-xs transition-colors',
                                                sortBy === option.id
                                                    ? 'bg-indigo-600 text-white font-bold'
                                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Columns Button */}
                    <div className="relative flex-1 md:flex-none z-30">
                        <button
                            onClick={() => setIsColumnsOpen(v => !v)}
                            className={clsx(
                                'w-full md:w-auto flex items-center justify-center gap-2 px-3 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
                                isColumnsOpen
                                    ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                                    : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                            )}
                            title="Choisir les colonnes"
                        >
                            <LayoutTemplate className="h-4 w-4" />
                        </button>

                        {isColumnsOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsColumnsOpen(false)} />
                                <div className="absolute top-full right-0 md:left-0 mt-2 w-56 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                                        Affichage
                                    </div>
                                    {COLUMN_OPTIONS.map((col) => (
                                        <button
                                            key={col.id}
                                            onClick={() => onToggleColumn(col.id)}
                                            className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-3 hover:bg-white/5 text-gray-300 hover:text-white"
                                        >
                                            <div className={clsx(
                                                'w-4 h-4 rounded border flex items-center justify-center transition-all',
                                                visibleColumns[col.id]
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-white/5 border-white/20'
                                            )}>
                                                {visibleColumns[col.id] && <CheckCircle className="w-3 h-3 fill-current" />}
                                            </div>
                                            {col.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Select All Button */}
                    <button
                        onClick={onSelectAll}
                        className={clsx(
                            'flex-1 md:flex-none flex items-center justify-center gap-2 px-3 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
                            isAllSelected
                                ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                                : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                        title={selectedCount === filteredCount ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Tout</span>
                    </button>

                    {/* Advanced Filters Button */}
                    <button
                        onClick={onOpenFilterModal}
                        className={clsx(
                            'flex-1 md:flex-none flex items-center justify-center gap-2 px-4 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
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

                {/* Actions Row */}
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
        </div>
    )
}
