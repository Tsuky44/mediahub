'use client'

import { useCallback, useState } from 'react'
import { toast } from 'react-hot-toast'

const isDev = process.env.NODE_ENV === 'development'
const logError = (...args: any[]) => { if (isDev) console.error(...args) }

export interface UseRequestSelectionResult {
    selectedIds: number[]
    deletingId: number | null
    isBulkDeleting: boolean
    toggleSelection: (requestId: number) => void
    toggleSelectAll: (allIds: number[]) => void
    clearSelection: () => void
    deleteOne: (params: { requestId: number; title: string; tmdbId: string; mediaType: string }) => Promise<boolean>
    deleteBulk: (items: any[]) => Promise<{ successCount: number; errorOccurred: boolean }>
}

/**
 * Gere la selection et la suppression (unitaire ou groupee) des demandes.
 * Retourne le nombre de succes pour permettre au consommateur de mettre
 * a jour sa liste d'items.
 */
export function useRequestSelection(canDelete: boolean): UseRequestSelectionResult {
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    const toggleSelection = useCallback((requestId: number) => {
        if (!canDelete) return
        setSelectedIds(prev =>
            prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
        )
    }, [canDelete])

    const toggleSelectAll = useCallback((allIds: number[]) => {
        if (!canDelete) return
        setSelectedIds(prev => (prev.length === allIds.length ? [] : allIds))
    }, [canDelete])

    const clearSelection = useCallback(() => setSelectedIds([]), [])

    const deleteOne = useCallback(async ({ requestId, title, tmdbId, mediaType }: { requestId: number; title: string; tmdbId: string; mediaType: string }): Promise<boolean> => {
        if (!window.confirm(`Voulez-vous vraiment supprimer la demande pour "${title}" ?`)) return false

        setDeletingId(requestId)
        try {
            const res = await fetch(
                `/api/media/${tmdbId}/manage?action=request&targetId=${requestId}&type=${mediaType}`,
                { method: 'DELETE' }
            )
            if (res.ok) {
                toast.success('Demande supprimée avec succès')
                return true
            }
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || 'Erreur lors de la suppression')
            return false
        } catch (e) {
            logError('[useRequestSelection] Delete error:', e)
            toast.error('Une erreur est survenue')
            return false
        } finally {
            setDeletingId(null)
        }
    }, [])

    const deleteBulk = useCallback(async (items: any[]): Promise<{ successCount: number; errorOccurred: boolean }> => {
        if (selectedIds.length === 0) return { successCount: 0, errorOccurred: false }

        const count = selectedIds.length
        if (!window.confirm(`Voulez-vous vraiment supprimer les ${count} demandes sélectionnées ?`)) {
            return { successCount: 0, errorOccurred: false }
        }

        setIsBulkDeleting(true)
        try {
            // Group selected items by (tmdbId, mediaType) for efficient API calls
            const groups: Record<string, { tmdbId: string; type: string; ids: number[] }> = {}

            selectedIds.forEach(id => {
                const item = items.find(i => i.id === id)
                if (item) {
                    const key = `${item.media.tmdbId}-${item.type}`
                    if (!groups[key]) {
                        groups[key] = { tmdbId: item.media.tmdbId, type: item.type, ids: [] }
                    }
                    groups[key].ids.push(id)
                }
            })

            let successCount = 0
            let errorOccurred = false

            for (const key in groups) {
                const group = groups[key]
                const res = await fetch(
                    `/api/media/${group.tmdbId}/manage?action=request&targetId=${group.ids.join(',')}&type=${group.type}`,
                    { method: 'DELETE' }
                )
                if (res.ok) successCount += group.ids.length
                else errorOccurred = true
            }

            if (successCount > 0) {
                toast.success(`${successCount} demande(s) supprimée(s) avec succès`)
            }
            if (errorOccurred) {
                toast.error("Certaines demandes n'ont pas pu être supprimées")
            }

            return { successCount, errorOccurred }
        } catch (e) {
            logError('[useRequestSelection] Bulk delete error:', e)
            toast.error('Une erreur est survenue lors de la suppression groupée')
            return { successCount: 0, errorOccurred: true }
        } finally {
            setIsBulkDeleting(false)
        }
    }, [selectedIds])

    return {
        selectedIds,
        deletingId,
        isBulkDeleting,
        toggleSelection,
        toggleSelectAll,
        clearSelection,
        deleteOne,
        deleteBulk,
    }
}
