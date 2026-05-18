'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { fetchUserRequests, forceSyncRequests } from '../actions'
import { groupRequests } from '../_utils/group-requests'

export interface UseInfiniteRequestsInit {
    results: any[]
    total: number
    totalPages: number
}

export interface UseInfiniteRequestsResult {
    items: any[]
    setItems: React.Dispatch<React.SetStateAction<any[]>>
    hasMore: boolean
    loading: boolean
    isSyncing: boolean
    loadMore: () => Promise<void>
    sync: () => void
    refresh: () => void
}

/**
 * Gere la pagination infinie, la synchronisation et le rafraichissement
 * de la liste des demandes (media requests).
 */
export function useInfiniteRequests(initialData: UseInfiniteRequestsInit): UseInfiniteRequestsResult {
    const [items, setItems] = useState<any[]>(groupRequests(initialData.results))
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(initialData.totalPages > 1)
    const [loading, setLoading] = useState(false)
    const [isSyncing, startSync] = useTransition()

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        const nextPage = page + 1
        const data = await fetchUserRequests(nextPage)

        if (data.results.length > 0) {
            setItems(prev => {
                const existingGroupIds = new Set(prev.flatMap((i: any) => i.groupedIds ?? [i.id]))
                const newItems = data.results.filter(
                    (newItem: any) => !existingGroupIds.has(newItem.id)
                )
                return groupRequests([...prev, ...newItems])
            })
            setPage(nextPage)
            setHasMore(nextPage < (data.totalPages || 0))
        } else {
            setHasMore(false)
        }
        setLoading(false)
    }, [loading, hasMore, page])

    const sync = useCallback(() => {
        startSync(async () => {
            const result = await forceSyncRequests()
            if (result.success) {
                if (result.importedCount && result.importedCount > 0) {
                    toast.success(`${result.importedCount} demandes importées`)
                } else {
                    toast.success('Synchronisation terminée')
                }
                const newData = await fetchUserRequests(1)
                setItems(groupRequests(newData.results))
                setPage(1)
                setHasMore(newData.totalPages > 1)
            } else {
                toast.error('Erreur lors de la synchronisation')
            }
        })
    }, [])

    const refresh = useCallback(() => {
        startSync(async () => {
            const newData = await fetchUserRequests(1)
            setItems(groupRequests(newData.results))
            setPage(1)
            setHasMore(newData.totalPages > 1)
        })
    }, [])

    return {
        items,
        setItems,
        hasMore,
        loading,
        isSyncing,
        loadMore,
        sync,
        refresh,
    }
}
