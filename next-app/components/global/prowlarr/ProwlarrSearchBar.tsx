'use client'

import { Search, Loader2, Filter } from 'lucide-react'

interface ProwlarrSearchBarProps {
    query: string
    onQueryChange: (q: string) => void
    onSubmit: () => void
    showFilters: boolean
    onToggleFilters: () => void
    selectedFiltersCount: number
    loading: boolean
    canSearch: boolean
    hasFreshResults: boolean
}

/** Barre de recherche Prowlarr (input + filtres + bouton submit). */
export function ProwlarrSearchBar({
    query,
    onQueryChange,
    onSubmit,
    showFilters,
    onToggleFilters,
    selectedFiltersCount,
    loading,
    canSearch,
    hasFreshResults,
}: ProwlarrSearchBarProps) {
    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    name="search-prowlarr"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    placeholder="Rechercher un torrent..."
                    className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
            </div>
            <button
                onClick={onToggleFilters}
                className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                    showFilters || selectedFiltersCount > 0
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                        : 'bg-gray-900/50 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
            >
                <Filter className="h-5 w-5" />
                <span className="hidden sm:inline">Filtres</span>
                {selectedFiltersCount > 0 && (
                    <span className="flex items-center justify-center bg-indigo-500 text-white text-[10px] font-bold h-4 w-4 rounded-full">
                        {selectedFiltersCount}
                    </span>
                )}
            </button>
            <button
                onClick={onSubmit}
                disabled={loading || !canSearch}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
                {loading && !hasFreshResults ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Search className="h-5 w-5" />
                )}
                Rechercher
            </button>
        </div>
    )
}
