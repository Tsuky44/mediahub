'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    searchProwlarr,
    getProwlarrIndexers,
    searchMediaReleases,
} from '@/app/dashboard/media/[id]/prowlarr-actions'
import type {
    ProwlarrIndexer,
    ProwlarrRelease,
    ProwlarrSearchSource,
    ProwlarrSortBy,
    ProwlarrSortOrder,
} from './prowlarr-types'
import { RESULTS_PER_PAGE } from './prowlarr-utils'

export interface SearchParams {
    query: string
    selectedIndexers: number[]
    selectedCategories: number[]
    showRecent: boolean
    searchSource: ProwlarrSearchSource
    mediaType?: 'movie' | 'tv'
    tmdbId?: number
    tvdbId?: number
    selectedSeason: number | null
    selectedEpisode: number | null
}

export interface UseProwlarrSearchResult {
    results: ProwlarrRelease[]
    setResults: React.Dispatch<React.SetStateAction<ProwlarrRelease[]>>
    indexers: ProwlarrIndexer[]
    loading: boolean
    error: string | null
    setError: (msg: string | null) => void
    page: number
    hasMore: boolean
    sortBy: ProwlarrSortBy
    sortOrder: ProwlarrSortOrder
    setSortBy: (s: ProwlarrSortBy) => void
    setSortOrder: (o: ProwlarrSortOrder) => void
    search: (params: SearchParams, newOffset?: number, append?: boolean) => Promise<void>
}

/**
 * Gere la recherche Prowlarr (raw ou smart via Sonarr/Radarr) avec pagination,
 * tri client-side et chargement initial des indexers.
 */
export function useProwlarrSearch(): UseProwlarrSearchResult {
    const [results, setResults] = useState<ProwlarrRelease[]>([])
    const [indexers, setIndexers] = useState<ProwlarrIndexer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [sortBy, setSortBy] = useState<ProwlarrSortBy>('seeders')
    const [sortOrder, setSortOrder] = useState<ProwlarrSortOrder>('desc')

    // Load indexers once
    useEffect(() => {
        getProwlarrIndexers().then(res => {
            if (res.indexers) setIndexers(res.indexers.filter((i: any) => i.enable))
        })
    }, [])

    // Sort when sortBy / sortOrder changes
    useEffect(() => {
        if (results.length === 0) return
        const sorted = [...results].sort((a, b) => {
            let valA: number = 0
            let valB: number = 0
            if (sortBy === 'seeders') {
                valA = a.seeders ?? 0
                valB = b.seeders ?? 0
            } else if (sortBy === 'publishDate') {
                valA = new Date(a.publishDate).getTime()
                valB = new Date(b.publishDate).getTime()
            } else if (sortBy === 'size') {
                valA = a.size ?? 0
                valB = b.size ?? 0
            }
            return sortOrder === 'desc' ? valB - valA : valA - valB
        })
        const changed = sorted.some((val, idx) => val.guid !== results[idx].guid)
        if (changed) setResults(sorted)
    }, [sortBy, sortOrder, results])

    const search = useCallback(async (params: SearchParams, newOffset: number = 0, append: boolean = false) => {
        const {
            query, selectedIndexers, selectedCategories, showRecent, searchSource,
            mediaType, tmdbId, tvdbId, selectedSeason, selectedEpisode,
        } = params

        const hasQuery = (query || '').trim().length > 0
        const hasFilters = selectedCategories.length > 0 || selectedIndexers.length > 0
        const hasContext = !!(mediaType && tmdbId)
        if (!hasQuery && !hasFilters && !showRecent && !hasContext) return

        if (searchSource === 'smart' && mediaType === 'tv' && tmdbId && selectedSeason === null && !hasQuery) {
            if (newOffset === 0) setError('Veuillez sélectionner une saison')
            return
        }

        setLoading(true)
        setError(null)
        if (!append && newOffset === 0) {
            setResults([])
            setPage(0)
        }

        try {
            let res: any
            if (
                searchSource === 'smart' && mediaType && tmdbId &&
                (mediaType === 'movie' || (mediaType === 'tv' && selectedSeason !== null))
            ) {
                res = await searchMediaReleases(
                    mediaType, tmdbId, tvdbId,
                    selectedSeason ?? undefined, selectedEpisode ?? undefined,
                )
            } else {
                res = await searchProwlarr(
                    (showRecent && !hasQuery) ? '' : query,
                    selectedIndexers.length > 0 ? selectedIndexers : undefined,
                    selectedCategories.length > 0 ? selectedCategories : undefined,
                    RESULTS_PER_PAGE,
                    newOffset,
                )
            }

            if (res.error) {
                setError(res.error)
            } else {
                const newResults: ProwlarrRelease[] = res.results || []
                if (append) {
                    setResults(prev => [...prev, ...newResults])
                } else {
                    setResults(newResults)
                }
                setHasMore(newResults.length >= 40)
                if (!append) {
                    setPage(Math.floor(newOffset / RESULTS_PER_PAGE))
                } else {
                    setPage(prev => prev + 1)
                }
            }
        } catch {
            setError('Une erreur est survenue lors de la recherche')
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        results, setResults, indexers,
        loading, error, setError,
        page, hasMore,
        sortBy, sortOrder, setSortBy, setSortOrder,
        search,
    }
}
