'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { StorageItem, ItemDetails, SeasonDetail } from '../_types/storage'

interface DeletePayload {
    item: StorageItem
    season?: SeasonDetail
    deleteFromArr: boolean
}

export interface UseStorageItemsResult {
    items: StorageItem[]
    loading: boolean
    selectedItem: StorageItem | null
    details: ItemDetails | null
    loadingDetails: boolean
    refetch: () => Promise<void>
    openDetails: (item: StorageItem) => Promise<void>
    closeDetails: () => void
    deleteItem: (payload: DeletePayload) => Promise<boolean>
}

/**
 * Gere le chargement de la liste de stockage (films/series), des details (saisons
 * + activite par utilisateur) et les suppressions (film, serie, saison).
 */
export function useStorageItems(): UseStorageItemsResult {
    const [items, setItems] = useState<StorageItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null)
    const [details, setDetails] = useState<ItemDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const router = useRouter()

    const fetchStorage = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/storage')
            if (!res.ok) throw new Error('Erreur lors du chargement des données')
            const data = await res.json()
            setItems(data)
        } catch (error) {
            toast.error('Impossible de charger les statistiques de stockage')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStorage()
    }, [fetchStorage])

    const openDetails = useCallback(async (item: StorageItem) => {
        setSelectedItem(item)
        setLoadingDetails(true)
        setDetails(null)
        try {
            const res = await fetch(`/api/admin/storage/details?itemId=${item.id}&type=${item.type}`)
            if (!res.ok) throw new Error('Erreur lors du chargement des détails')
            const data = await res.json()
            setDetails(data)
        } catch (error) {
            console.error(error)
            toast.error('Impossible de charger les détails')
        } finally {
            setLoadingDetails(false)
        }
    }, [])

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
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Erreur lors de la suppression')
            }

            toast.success(season ? 'Saison supprimée' : 'Élément supprimé avec succès')

            if (season) {
                // Refresh details + main list (size changes)
                await openDetails(item)
                await fetchStorage()
            } else {
                setItems(prev => prev.filter(i => i.id !== item.id))
                setSelectedItem(null)
                router.refresh()
            }

            return true
        } catch (error: any) {
            toast.error(error.message)
            return false
        }
    }, [fetchStorage, openDetails, router])

    return {
        items,
        loading,
        selectedItem,
        details,
        loadingDetails,
        refetch: fetchStorage,
        openDetails,
        closeDetails,
        deleteItem,
    }
}
