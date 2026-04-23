'use client'

import { useState, useMemo } from 'react'
import { MediaList } from './MediaList'
import { Clapperboard, Tv, Search } from 'lucide-react'

interface MediaTabsProps {
    movies: any[]
    series: any[]
}

export function MediaTabs({ movies, series }: MediaTabsProps) {
    const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredMovies = useMemo(() => {
        if (!searchQuery) return movies
        const lowerQuery = searchQuery.toLowerCase()
        return movies.filter(m => m.title.toLowerCase().includes(lowerQuery))
    }, [movies, searchQuery])

    const filteredSeries = useMemo(() => {
        if (!searchQuery) return series
        const lowerQuery = searchQuery.toLowerCase()
        return series.filter(s => s.name.toLowerCase().includes(lowerQuery))
    }, [series, searchQuery])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-xs order-2 md:order-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        name="search-media"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck="false"
                        data-1p-ignore="true"
                        data-lpignore="true"
                        data-form-type="other"
                        className="block w-full rounded-md border border-gray-700 bg-gray-800 py-2 pl-10 pr-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div className="flex justify-center border-b border-gray-700 order-1 md:order-2 md:flex-1 md:border-b-0">
                    <div className="flex p-1 bg-gray-900/50 rounded-full border border-gray-800/50 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab('movies')}
                            className={`group flex items-center gap-2 px-6 py-2 text-sm font-medium transition-all rounded-full ${
                                activeTab === 'movies'
                                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                            title="Films"
                        >
                            <Clapperboard className={`h-4 w-4 ${activeTab === 'movies' ? 'fill-current' : ''}`} />
                            <span className="hidden sm:inline">Films ({filteredMovies.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('series')}
                            className={`group flex items-center gap-2 px-6 py-2 text-sm font-medium transition-all rounded-full ${
                                activeTab === 'series'
                                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                            title="Séries"
                        >
                            <Tv className={`h-4 w-4 ${activeTab === 'series' ? 'fill-current' : ''}`} />
                            <span className="hidden sm:inline">Séries ({filteredSeries.length})</span>
                        </button>
                    </div>
                </div>
                
                {/* Spacer for layout balance on desktop */}
                <div className="hidden md:block md:w-full md:max-w-xs order-3"></div>
            </div>

            <div className="min-h-[200px]">
                {activeTab === 'movies' && (
                    filteredMovies.length > 0 ? (
                        <MediaList variant="grid" items={filteredMovies} showFavoriteButton />
                    ) : (
                        <div className="text-center text-gray-400 py-12">
                            {searchQuery ? 'Aucun film ne correspond à votre recherche.' : 'Aucun film trouvé.'}
                        </div>
                    )
                )}

                {activeTab === 'series' && (
                    filteredSeries.length > 0 ? (
                        <MediaList variant="grid" items={filteredSeries} showFavoriteButton />
                    ) : (
                        <div className="text-center text-gray-400 py-12">
                            {searchQuery ? 'Aucune série ne correspond à votre recherche.' : 'Aucune série trouvée.'}
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
