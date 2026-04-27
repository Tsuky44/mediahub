'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

import { useProwlarrSearch } from './prowlarr/useProwlarrSearch'
import { useProwlarrDownload } from './prowlarr/useProwlarrDownload'
import { useProwlarrEpisodes } from './prowlarr/useProwlarrEpisodes'
import { buildTvQuery, RESULTS_PER_PAGE } from './prowlarr/prowlarr-utils'
import type {
    ProwlarrRelease,
    ProwlarrSearchSource,
    ProwlarrSeason,
    ProwlarrSortBy,
} from './prowlarr/prowlarr-types'

import { ProwlarrSearchBar } from './prowlarr/ProwlarrSearchBar'
import { ProwlarrSeasonEpisodeSelector } from './prowlarr/ProwlarrSeasonEpisodeSelector'
import { ProwlarrFiltersPanel } from './prowlarr/ProwlarrFiltersPanel'
import { ProwlarrBulkBar } from './prowlarr/ProwlarrBulkBar'
import { ProwlarrResultsTable } from './prowlarr/ProwlarrResultsTable'
import { ProwlarrPagination } from './prowlarr/ProwlarrPagination'

interface ProwlarrSearchProps {
    title: string
    canManage?: boolean
    mediaType?: 'movie' | 'tv'
    tmdbId?: number
    tvdbId?: number
    seasons?: ProwlarrSeason[]
    initialSeason?: number | null
    initialEpisode?: number | null
}

/**
 * Composant global de recherche de torrents via Prowlarr (raw) ou Sonarr/Radarr (smart).
 * Orchestre 3 hooks (search, download, episodes) et 6 sous-composants.
 */
export function ProwlarrSearch({
    title,
    canManage = true,
    mediaType,
    tmdbId,
    tvdbId,
    seasons,
    initialSeason = null,
    initialEpisode = null,
}: ProwlarrSearchProps) {
    const [query, setQuery] = useState(title || '')
    const [selectedSeason, setSelectedSeason] = useState<number | null>(initialSeason)
    const [selectedEpisode, setSelectedEpisode] = useState<number | null>(initialEpisode)
    const [searchSource] = useState<ProwlarrSearchSource>('raw')
    const [selectedIndexers, setSelectedIndexers] = useState<number[]>([])
    const [selectedCategories, setSelectedCategories] = useState<number[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [showRecent, setShowRecent] = useState(false)

    const {
        results, indexers,
        loading, error, setError,
        page, hasMore,
        sortBy, sortOrder, setSortBy, setSortOrder,
        search,
    } = useProwlarrSearch()

    const {
        downloading, downloadSuccess, bulkDownloading,
        selectedGuids,
        toggleSelect, toggleSelectAll,
        download, bulkDownload,
    } = useProwlarrDownload()

    const { episodes, loading: loadingEpisodes } = useProwlarrEpisodes(mediaType, tmdbId, selectedSeason)

    const currentParams = {
        query,
        selectedIndexers,
        selectedCategories,
        showRecent,
        searchSource,
        mediaType,
        tmdbId,
        tvdbId,
        selectedSeason,
        selectedEpisode,
    }

    // Initial search (skip TV without season)
    const initialSearchDone = useRef(false)
    useEffect(() => {
        if (initialSearchDone.current) return
        if (mediaType === 'tv' && selectedSeason === null) return
        initialSearchDone.current = true
        search(currentParams, 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-search when season/episode changes (TV)
    useEffect(() => {
        if (mediaType !== 'tv' || selectedSeason === null) return
        const newQuery = buildTvQuery(title, selectedSeason, selectedEpisode)
        setQuery(newQuery)
        search({ ...currentParams, query: newQuery }, 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSeason, selectedEpisode])

    const hasContext = !!(mediaType && tmdbId && (mediaType === 'movie' || selectedSeason !== null))
    const canSearch =
        (query || '').trim().length > 0 ||
        showRecent ||
        selectedCategories.length > 0 ||
        selectedIndexers.length > 0 ||
        hasContext

    const toggleCategory = (id: number) => {
        setSelectedCategories(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]))
    }
    const toggleIndexer = (id: number) => {
        setSelectedIndexers(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
    }
    const resetFilters = () => {
        setSelectedCategories([])
        setSelectedIndexers([])
        setShowRecent(false)
    }

    const handleSort = (col: ProwlarrSortBy) => {
        if (sortBy === col) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(col)
            setSortOrder('desc')
        }
    }

    const handleDownload = (release: ProwlarrRelease) => {
        download(release, { mediaType, tmdbId, tvdbId, selectedSeason, selectedEpisode })
    }

    const handleBulkDownload = () => {
        const selected = results.filter(r => selectedGuids.has(r.guid))
        bulkDownload(selected, { mediaType, tmdbId, tvdbId, selectedSeason, selectedEpisode })
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3">
                <ProwlarrSearchBar
                    query={query}
                    onQueryChange={setQuery}
                    onSubmit={() => {
                        setError(null)
                        search(currentParams, 0)
                    }}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    selectedFiltersCount={selectedCategories.length + selectedIndexers.length}
                    loading={loading}
                    canSearch={canSearch}
                    hasFreshResults={results.length > 0}
                />

                {mediaType === 'tv' && seasons && seasons.length > 0 && (
                    <ProwlarrSeasonEpisodeSelector
                        seasons={seasons}
                        selectedSeason={selectedSeason}
                        onSeasonChange={setSelectedSeason}
                        selectedEpisode={selectedEpisode}
                        onEpisodeChange={setSelectedEpisode}
                        episodes={episodes}
                        loadingEpisodes={loadingEpisodes}
                    />
                )}

                {showFilters && (
                    <ProwlarrFiltersPanel
                        selectedCategories={selectedCategories}
                        onToggleCategory={toggleCategory}
                        indexers={indexers}
                        selectedIndexers={selectedIndexers}
                        onToggleIndexer={toggleIndexer}
                        showRecent={showRecent}
                        onToggleRecent={() => setShowRecent(!showRecent)}
                        onReset={resetFilters}
                    />
                )}
            </div>

            {error ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            ) : (
                <div className="space-y-4">
                    <ProwlarrBulkBar
                        selectedCount={selectedGuids.size}
                        bulkDownloading={bulkDownloading}
                        onBulkDownload={handleBulkDownload}
                    />

                    <ProwlarrResultsTable
                        results={results}
                        loading={loading}
                        canManage={canManage}
                        selectedGuids={selectedGuids}
                        downloading={downloading}
                        downloadSuccess={downloadSuccess}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={() => toggleSelectAll(results.map(r => r.guid))}
                        onSort={handleSort}
                        onDownload={handleDownload}
                    />

                    {(results.length > 0 || loading) && (
                        <ProwlarrPagination
                            page={page}
                            resultsCount={results.length}
                            hasMore={hasMore}
                            loading={loading}
                            onPrevPage={() => search(currentParams, (page - 1) * RESULTS_PER_PAGE)}
                            onNextPage={() => search(currentParams, (page + 1) * RESULTS_PER_PAGE)}
                            onLoadMore={() => search(currentParams, (page + 1) * RESULTS_PER_PAGE, true)}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
