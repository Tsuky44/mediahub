'use client'

import clsx from 'clsx'
import { Search, LayoutGrid, List as ListIcon } from 'lucide-react'
import type { DockerViewMode } from '../_types/docker'

interface DockerSearchBarProps {
    searchQuery: string
    onSearchQueryChange: (value: string) => void
    viewMode: DockerViewMode
    onViewModeChange: (mode: DockerViewMode) => void
}

/**
 * Barre de recherche + selecteur de mode de vue (grille/liste).
 */
export function DockerSearchBar({
    searchQuery,
    onSearchQueryChange,
    viewMode,
    onViewModeChange,
}: DockerSearchBarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20 backdrop-blur-md p-2 rounded-3xl border border-white/5 shadow-2xl shadow-black/20">
            <div className="relative flex-1 w-full sm:w-auto group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 rounded-xl border border-white/5 group-focus-within:border-indigo-500/30 group-focus-within:bg-indigo-500/10 transition-all duration-300">
                    <Search className="w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                    type="text"
                    placeholder="Rechercher un conteneur..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl pl-14 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/20 transition-all font-medium"
                />
            </div>
            <div className="flex bg-black/20 rounded-2xl p-1.5 border border-white/5">
                <button
                    onClick={() => onViewModeChange('grid')}
                    className={clsx(
                        'px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2.5 font-bold text-sm',
                        viewMode === 'grid'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    )}
                    title="Vue Grille"
                >
                    <LayoutGrid className="w-4 h-4" />
                    {viewMode === 'grid' && <span className="pr-1">Grille</span>}
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    className={clsx(
                        'px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2.5 font-bold text-sm',
                        viewMode === 'list'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    )}
                    title="Vue Liste"
                >
                    <ListIcon className="w-4 h-4" />
                    {viewMode === 'list' && <span className="pr-1">Liste</span>}
                </button>
            </div>
        </div>
    )
}
