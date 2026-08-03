'use client'

import { useCallback, useEffect, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { StorageItem, ItemDetails, SeasonDetail, StorageListResponse, StorageTotals, StoragePagination, StorageSort } from '../_types/storage'

const PAGE_SIZE = 50

const storageQueryKey = (
    type: 'Movie' | 'Series',
    search: string,
    sort: StorageSort | null
) => ['admin-storage', type, search, sort?.key ?? 'size', sort?.dir ?? 'desc'] as const

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
    deleteMultiple: (items: StorageItem[], deleteFromArr: boolean) => Promise<{ success: number; failed: number; freedBytes: number }>
    cacheBuilding: boolean
}

async function fetchStoragePage(
    type: 'Movie' | 'Series',
    page: number,
    search: string,
    sort: StorageSort | null
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

/**
 * Charge le stockage page par page (50 médias) pour supporter les grosses bibliothèques.
 */
export function useStorageItems(
    activeTab: 'Movie' | 'Series',
    search: string,
    sort: StorageSort | null
): UseStorageItemsResult {
    const queryClient = useQueryClient()
    const router = useRouter()

    const [syncing, setSyncing] = useState(false)
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null)
    const [details, setDetails] = useState<ItemDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    const {
        data,
        isLoading,
        isFetchingNextPage,
        isError,
        error: queryError,
        hasNextPage,
        fetchNextPage,
        refetch: queryRefetch,
    } = useInfiniteQuery({
        queryKey: storageQueryKey(activeTab, search, sort),
        queryFn: ({ pageParam }) => fetchStoragePage(activeTab, pageParam, search, sort),
        initialPageParam: 1,
        getNextPageParam: (last) =>
            last.pagination.hasMore ? last.pagination.page + 1 : undefined,
        staleTime: STORAGE_STALE_TIME_MS,
        gcTime: 60 * 60 * 1000,
    })

    const items = data?.pages.flatMap(p => p.items) ?? []
    const totals = data?.pages[0]?.totals ?? EMPTY_TOTALS
    const pagination = data?.pages[data.pages.length - 1]?.pagination ?? EMPTY_PAGINATION
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
            await queryClient.invalidateQueries({ queryKey: storageQueryKey(activeTab, search, sort) })
            toast.success('Dates de lecture synchronisées')
        } catch (error) {
            console.error(error)
            toast.error('Impossible de synchroniser les dates de lecture')
        } finally {
            setSyncing(false)
        }
    }, [activeTab, items, queryClient, search, sort])

    const openDetails = useCallback(async (item: StorageItem) => {
        setSelectedItem(item)
        setLoadingDetails(true)
        setDetails(null)
        try {
            const res = await fetch(`/api/admin/storage/details?itemId=${item.id}&type=${item.type}`)
            if (!res.ok) throw new Error('Erreur lors du chargement des détails')
            const detailData = await res.json()
            setDetails(detailData)
            void queryClient.invalidateQueries({ queryKey: storageQueryKey(activeTab, search, sort) })
        } catch (error) {
            console.error(error)
            toast.error('Impossible de charger les détails')
        } finally {
            setLoadingDetails(false)
        }
    }, [activeTab, queryClient, search, sort])

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
                queryClient.setQueryData(
                    storageQueryKey(activeTab, search, sort),
                    (old: { pages: StorageListResponse[]; pageParams: number[] } | undefined) => {
                        if (!old) return old
                        const removedSize = item.size || 0
                        return {
                            ...old,
                            pages: old.pages.map((page, idx) => ({
                                ...page,
                                items: page.items.filter(i => i.id !== item.id),
                                totals: idx === 0
                                    ? {
                                        ...page.totals,
                                        all: Math.max(0, page.totals.all - removedSize),
                                        [activeTab === 'Movie' ? 'movies' : 'series']: Math.max(
                                            0,
                                            page.totals[activeTab === 'Movie' ? 'movies' : 'series'] - removedSize
                                        ),
                                    }
                                    : page.totals,
                                pagination: {
                                    ...page.pagination,
                                    total: Math.max(0, page.pagination.total - 1),
                                },
                            })),
                        }
                    }
                )
                setSelectedItem(null)
                router.refresh()
            }

            return true
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
            return false
        }
    }, [activeTab, openDetails, queryClient, refetch, router, search, sort])

    const deleteMultiple = useCallback(async (targets: StorageItem[], deleteFromArr: boolean): Promise<{ success: number; failed: number; freedBytes: number }> => {
        let success = 0
        let failed = 0
        const deletedIds: string[] = []
        let removedSize = 0

        for (const item of targets) {
            if (item.isPlaying) {
                failed++
                continue
            }
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
                success++
                deletedIds.push(item.id)
                removedSize += item.size || 0
            } catch {
                failed++
            }
        }

        if (deletedIds.length > 0) {
            queryClient.setQueryData(
                storageQueryKey(activeTab, search, sort),
                (old: { pages: StorageListResponse[]; pageParams: number[] } | undefined) => {
                    if (!old) return old
                    return {
                        ...old,
                        pages: old.pages.map((page, idx) => ({
                            ...page,
                            items: page.items.filter(i => !deletedIds.includes(i.id)),
                            totals: idx === 0
                                ? {
                                    ...page.totals,
                                    all: Math.max(0, page.totals.all - removedSize),
                                    [activeTab === 'Movie' ? 'movies' : 'series']: Math.max(
                                        0,
                                        page.totals[activeTab === 'Movie' ? 'movies' : 'series'] - removedSize
                                    ),
                                }
                                : page.totals,
                            pagination: {
                                ...page.pagination,
                                total: Math.max(0, page.pagination.total - deletedIds.length),
                            },
                        })),
                    }
                }
            )
        }
        if (success > 0) {
            router.refresh()
        }
        if (failed > 0) {
            toast.error(`${failed} suppression${failed > 1 ? 's' : ''} en échec`)
        }

        await refetch()

        return { success, failed, freedBytes: removedSize }
    }, [activeTab, queryClient, refetch, router, search, sort])

    return {
        items,
        totals,
        pagination,
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
    }
}
