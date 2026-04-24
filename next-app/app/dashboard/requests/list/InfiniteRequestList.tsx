'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Loader2, Info } from 'lucide-react'

import { useInfiniteRequests } from './_hooks/useInfiniteRequests'
import { useRequestSelection } from './_hooks/useRequestSelection'
import { RequestListToolbar } from './_components/RequestListToolbar'
import { RequestCard } from './_components/RequestCard'

interface InfiniteRequestListProps {
    initialData: {
        results: any[]
        total: number
        totalPages: number
    }
    canSync?: boolean
    canDelete?: boolean
}

export function InfiniteRequestList({
    initialData,
    canSync = false,
    canDelete = false,
}: InfiniteRequestListProps) {
    const { items, setItems, hasMore, loading, isSyncing, loadMore, sync, refresh } =
        useInfiniteRequests(initialData)

    const {
        selectedIds,
        deletingId,
        isBulkDeleting,
        toggleSelection,
        toggleSelectAll,
        clearSelection,
        deleteOne,
        deleteBulk,
    } = useRequestSelection(canDelete)

    const { ref, inView } = useInView()

    useEffect(() => {
        if (inView && hasMore && !loading) {
            loadMore()
        }
    }, [inView, hasMore, loading, loadMore])

    const handleBulkDelete = async () => {
        const { successCount } = await deleteBulk(items)
        if (successCount > 0) {
            setItems(prev => prev.filter(item => !selectedIds.includes(item.id)))
            clearSelection()
        }
    }

    const handleDeleteOne = async (e: React.MouseEvent, request: any) => {
        e.preventDefault()
        e.stopPropagation()
        const success = await deleteOne({
            requestId: request.id,
            title: request.media?.title || 'Sans titre',
            tmdbId: request.media?.tmdbId,
            mediaType: request.type === 'movie' ? 'movie' : 'tv',
        })
        if (success) {
            setItems(prev => prev.filter(item => item.id !== request.id))
        }
    }

    return (
        <div className="space-y-6">
            <RequestListToolbar
                canSync={canSync}
                canDelete={canDelete}
                selectedCount={selectedIds.length}
                totalCount={items.length}
                allSelected={selectedIds.length === items.length}
                isBulkDeleting={isBulkDeleting}
                isSyncing={isSyncing}
                onToggleSelectAll={() => toggleSelectAll(items.map(i => i.id))}
                onClearSelection={clearSelection}
                onBulkDelete={handleBulkDelete}
                onSync={sync}
                onRefresh={refresh}
            />

            <div className="grid grid-cols-1 gap-6">
                {items.map((request: any) => (
                    <RequestCard
                        key={request.id}
                        request={request}
                        isSelected={selectedIds.includes(request.id)}
                        canDelete={canDelete}
                        isDeleting={deletingId === request.id}
                        onToggleSelect={() => toggleSelection(request.id)}
                        onDelete={(e) => handleDeleteOne(e, request)}
                    />
                ))}
            </div>

            {hasMore && (
                <div ref={ref} className="flex justify-center py-8">
                    {loading && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}
                </div>
            )}

            {!hasMore && items.length > 0 && (
                <p className="text-center text-zinc-500 py-8 text-sm font-medium">
                    Toutes vos demandes ont été chargées
                </p>
            )}

            {items.length === 0 && !isSyncing && (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                    <Info className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">Aucune demande trouvée</p>
                    <button
                        onClick={refresh}
                        className="text-indigo-400 mt-2 text-sm font-bold hover:text-indigo-300 transition-colors"
                    >
                        Actualiser
                    </button>
                </div>
            )}
        </div>
    )
}
