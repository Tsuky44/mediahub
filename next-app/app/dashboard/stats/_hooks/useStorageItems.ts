'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type {
    StorageItem,
    ItemDetails,
    SeasonDetail,
    StorageListResponse,
    StorageTotals,
    StoragePagination,
    StorageSort,
    StorageFilters,
    BulkDeleteProgress,
} from '../_types/storage'
import { appendFilterParams, filtersKey } from '../_utils/storage-filters'

const PAGE_SIZE = 100

const storageQueryKey = (
    type: 'Movie' | 'Series',
    search: string,
    sort: StorageSort | null,
    filters: StorageFilters
) => ['admin-storage', type, search, sort?.key ?? 'size', sort?.dir ?? 'desc', filtersKey(filters)] as const

type StoragePages = InfiniteData<StorageListResponse, number>

/** Cache client : réouverture du modal instantanée pendant 30 min. */
const STORAGE_STALE_TIME_MS = 30 * 60 * 1000

const EMPTY_TOTALS: StorageTotals = { all: 0, movies: 0, series: 0 }
const EMPTY_PAGINATION: StoragePagination = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
}

interface DeletePayload {
    item: StorageItem
    season?: SeasonDetail
    deleteFromArr: boolean
}

export interface UseStorageItemsResult {
    items: StorageItem[]
    totals: StorageTotals
    pagination: StoragePagination
    /** Taille cumulée de tous les résultats, null si inconnue */
    matchedSize: number | null
    loading: boolean
    loadingMore: boolean
    syncing: boolean
    hasMore: boolean
    loadMore: () => void
    selectedItem: StorageItem | null
    details: ItemDetails | null
    loadingDetails: boolean
    refetch: () => Promise<void>
    syncLastPlayed: () => Promise<void>
    openDetails: (item: StorageItem) => Promise<void>
    closeDetails: () => void
    deleteItem: (payload: DeletePayload) => Promise<boolean>
    deleteMultiple: (
        items: StorageItem[],
        deleteFromArr: boolean,
        options?: { onProgress?: (progress: BulkDeleteProgress) => void; signal?: AbortSignal }
    ) => Promise<{ success: number; failed: number; freedBytes: number; processed: number }>
    cacheBuilding: boolean
    /** Résultats précédents affichés pendant le chargement d'un nouveau tri / filtre */
    refreshing: boolean
}

async function fetchStoragePage(
    type: 'Movie' | 'Series',
    page: number,
    search: string,
    sort: StorageSort | null,
    filters: StorageFilters
): Promise<StorageListResponse> {
    const params = new URLSearchParams({
        type,
        page: String(page),
        limit: String(PAGE_SIZE),
    })
    if (search.trim()) params.set('search', search.trim())
    if (sort) {
        params.set('sortBy', sort.key)
        params.set('sortDir', sort.dir)
    }
    appendFilterParams(params, filters)

    const res = await fetch(`/api/admin/storage?${params}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
        throw new Error('Session expirée — reconnectez-vous')
    }
    const data = await res.json()
    if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'Erreur lors du chargement des données'
        throw new Error(translateStorageError(msg))
    }
    return data as StorageListResponse
}

function translateStorageError(message: string): string {
    if (message.includes('502')) {
        return 'Emby/Jellyfin surchargé — réessayez dans quelques secondes'
    }
    if (message.includes('504') || message.toLowerCase().includes('timeout')) {
        return 'Délai dépassé — la bibliothèque est peut-être trop volumineuse, réessayez'
    }
    return message
}

/** Retire des médias supprimés des pages déjà chargées (et ajuste les totaux). */
function removeFromPages(
    old: StoragePages | undefined,
    ids: Set<string>,
    removedSize: number,
    activeTab: 'Movie' | 'Series'
): StoragePages | undefined {
    if (!old) return old
    const categoryKey = activeTab === 'Movie' ? 'movies' : 'series'
    return {
        ...old,
        pages: old.pages.map((page, idx) => ({
            ...page,
            items: page.items.filter(i => !ids.has(i.id)),
            totals: idx === 0
                ? {
                    ...page.totals,
                    all: Math.max(0, page.totals.all - removedSize),
                    [categoryKey]: Math.max(0, page.totals[categoryKey] - removedSize),
                }
                : page.totals,
            pagination: {
                ...page.pagination,
                total: Math.max(0, page.pagination.total - ids.size),
            },
            matchedSize: page.matchedSize != null ? Math.max(0, page.matchedSize - removedSize) : page.matchedSize,
        })),
    }
}

/**
 * Charge le stockage page par page (100 médias) pour supporter les grosses bibliothèques.
 * Tri et filtres sont appliqués par l'API sur toute la bibliothèque.
 */
export function useStorageItems(
    activeTab: 'Movie' | 'Series',
    search: string,
    sort: StorageSort | null,
    filters: StorageFilters
): UseStorageItemsResult {
    const queryClient = useQueryClient()
    const router = useRouter()

    const [syncing, setSyncing] = useState(false)
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null)
    const [details, setDetails] = useState<ItemDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    const queryKey = useMemo(
        () => storageQueryKey(activeTab, search, sort, filters),
        [activeTab, search, sort, filters]
    )

    const {
        data,
        isLoading,
        isFetchingNextPage,
        isPlaceholderData,
        isError,
        error: queryError,
        hasNextPage,
        fetchNextPage,
        refetch: queryRefetch,
    } = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) => fetchStoragePage(activeTab, pageParam, search, sort, filters),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.pagination.hasMore ? last.pagination.page + 1 : undefined,
        staleTime: STORAGE_STALE_TIME_MS,
        gcTime: 60 * 60 * 1000,
        // Nouveau tri / filtre sur le même onglet : la liste actuelle reste affichée
        // (estompée) le temps du chargement, au lieu de clignoter.
        placeholderData: (previous, previousQuery) =>
            previousQuery?.queryKey[1] === activeTab ? previous : undefined,
    })

    // Dédoublonnage par id : une page rechargée après une mise à jour de la
    // bibliothèque peut recouvrir la précédente.
    const items = useMemo(() => {
        const seen = new Set<string>()
        const list: StorageItem[] = []
        for (const page of data?.pages ?? []) {
            for (const item of page.items) {
                if (seen.has(item.id)) continue
                seen.add(item.id)
                list.push(item)
            }
        }
        return list
    }, [data])
    const totals = data?.pages[0]?.totals ?? EMPTY_TOTALS
    const pagination = data?.pages[data.pages.length - 1]?.pagination ?? EMPTY_PAGINATION
    const matchedSize = data?.pages[data.pages.length - 1]?.matchedSize ?? null
    const cacheReady = data?.pages[0]?.cacheReady
    const cacheBuilding = !isLoading && items.length > 0 && (
        (activeTab === 'Movie' && cacheReady && !cacheReady.movies) ||
        (activeTab === 'Series' && cacheReady && !cacheReady.series) ||
        (totals.all === 0 && !cacheReady?.totals)
    )

    useEffect(() => {
        if (!cacheReady || isLoading) return
        const tabReady = activeTab === 'Movie' ? cacheReady.movies : cacheReady.series
        if (tabReady && cacheReady.totals) return
        const timer = setTimeout(() => { void queryRefetch() }, 4000)
        return () => clearTimeout(timer)
    }, [activeTab, cacheReady, isLoading, queryRefetch])

    useEffect(() => {
        if (!isError) return
        const message = queryError instanceof Error
            ? queryError.message
            : 'Impossible de charger les statistiques de stockage'
        toast.error(message)
    }, [isError, queryError])

    const refetch = useCallback(async () => {
        await queryRefetch()
    }, [queryRefetch])

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
    }, [fetchNextPage, hasNextPage, isFetchingNextPage])

    const syncLastPlayed = useCallback(async () => {
        setSyncing(true)
        try {
            const itemIds = items.map(i => i.id)
            const res = await fetch('/api/admin/storage/refresh-dates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: activeTab, itemIds }),
            })
            if (!res.ok) throw new Error('Erreur lors de la synchronisation')
            await queryClient.invalidateQueries({ queryKey: ['admin-storage', activeTab] })
            toast.success('Dates de lecture synchronisées')
        } catch (error) {
            console.error(error)
            toast.error('Impossible de synchroniser les dates de lecture')
        } finally {
            setSyncing(false)
        }
    }, [activeTab, items, queryClient])

    const openDetails = useCallback(async (item: StorageItem) => {
        setSelectedItem(item)
        setLoadingDetails(true)
        setDetails(null)
        try {
            const res = await fetch(`/api/admin/storage/details?itemId=${item.id}&type=${item.type}`)
            if (!res.ok) throw new Error('Erreur lors du chargement des détails')
            const detailData = await res.json()
            setDetails(detailData)
            void queryClient.invalidateQueries({ queryKey: ['admin-storage', activeTab] })
        } catch (error) {
            console.error(error)
            toast.error('Impossible de charger les détails')
        } finally {
            setLoadingDetails(false)
        }
    }, [activeTab, queryClient])

    const closeDetails = useCallback(() => {
        setSelectedItem(null)
        setDetails(null)
    }, [])

    const deleteItem = useCallback(async ({ item, season, deleteFromArr }: DeletePayload): Promise<boolean> => {
        try {
            const payload = {
                itemId: season ? season.id : item.id,
                type: season ? 'Season' : item.type,
                deleteFromArr,
                providerId: item.type === 'Movie' ? item.tmdbId : item.tvdbId,
                seasonNumber: season ? season.index : undefined,
            }

            const res = await fetch('/api/admin/storage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Erreur lors de la suppression')
            }

            toast.success(season ? 'Saison supprimée' : 'Élément supprimé avec succès')

            if (season) {
                await openDetails(item)
                await refetch()
            } else {
                queryClient.setQueryData<StoragePages>(queryKey, old =>
                    removeFromPages(old, new Set([item.id]), item.size || 0, activeTab)
                )
                setSelectedItem(null)
                router.refresh()
            }

            return true
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
            return false
        }
    }, [activeTab, openDetails, queryClient, queryKey, refetch, router])

    const deleteMultiple = useCallback(async (
        targets: StorageItem[],
        deleteFromArr: boolean,
        options?: { onProgress?: (progress: BulkDeleteProgress) => void; signal?: AbortSignal }
    ): Promise<{ success: number; failed: number; freedBytes: number; processed: number }> => {
        const progress: BulkDeleteProgress = {
            statuses: Object.fromEntries(targets.map(t => [t.id, 'pending'])),
            processed: 0,
            total: targets.length,
            successCount: 0,
            failedCount: 0,
            freedBytes: 0,
            currentName: null,
        }
        const report = () => options?.onProgress?.({ ...progress, statuses: { ...progress.statuses } })
        report()

        // Une suppression à la fois : Emby, Radarr et Sonarr ne sont pas sollicités en parallèle.
        for (const item of targets) {
            if (options?.signal?.aborted) {
                progress.statuses[item.id] = 'skipped'
                continue
            }
            if (item.isPlaying) {
                progress.statuses[item.id] = 'failed'
                progress.failedCount++
                progress.processed++
                report()
                continue
            }

            progress.statuses[item.id] = 'deleting'
            progress.currentName = item.name
            report()

            try {
                const payload = {
                    itemId: item.id,
                    type: item.type,
                    deleteFromArr,
                    providerId: item.type === 'Movie' ? item.tmdbId : item.tvdbId,
                }

                const res = await fetch('/api/admin/storage', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) throw new Error()
                progress.statuses[item.id] = 'done'
                progress.successCount++
                progress.freedBytes += item.size || 0
                // La ligne disparaît de la liste dès que le média est supprimé
                queryClient.setQueryData<StoragePages>(queryKey, old =>
                    removeFromPages(old, new Set([item.id]), item.size || 0, activeTab)
                )
            } catch {
                progress.statuses[item.id] = 'failed'
                progress.failedCount++
            }
            progress.processed++
            report()
        }

        progress.currentName = null
        report()

        const { successCount: success, failedCount: failed, freedBytes } = progress
        if (success > 0) {
            router.refresh()
        }
        if (failed > 0) {
            toast.error(`${failed} suppression${failed > 1 ? 's' : ''} en échec`)
        }

        await refetch()

        return { success, failed, freedBytes, processed: progress.processed }
    }, [activeTab, queryClient, queryKey, refetch, router])

    return {
        items,
        totals,
        pagination,
        matchedSize,
        loading: isLoading,
        loadingMore: isFetchingNextPage,
        hasMore: !!hasNextPage,
        loadMore,
        syncing,
        selectedItem,
        details,
        loadingDetails,
        refetch,
        syncLastPlayed,
        openDetails,
        closeDetails,
        deleteItem,
        deleteMultiple,
        cacheBuilding,
        refreshing: isPlaceholderData,
    }
}
