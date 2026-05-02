'use client'

import { useEffect } from 'react'
import { Loader2, Info } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import { RequestCard } from './RequestCard'

interface RequestListItemsProps {
    visibleItems: any[]
    hasMore: boolean
    loading: boolean
    isSyncing: boolean
    selectedIds: number[]
    deletingId: number | null
    canDelete: boolean
    onToggleSelect: (id: number) => void
    onDelete: (e: React.MouseEvent, request: any) => void
    onLoadMore: () => void
    onRefresh: () => void
}

export function RequestListItems({
    visibleItems,
    hasMore,
    loading,
    isSyncing,
    selectedIds,
    deletingId,
    canDelete,
    onToggleSelect,
    onDelete,
    onLoadMore,
    onRefresh,
}: RequestListItemsProps) {
    const { ref, inView } = useInView()

    useEffect(() => {
        if (inView && hasMore && !loading) {
            onLoadMore()
        }
    }, [inView, hasMore, loading, onLoadMore])

    return (
        <>
            <div className="grid grid-cols-1 gap-6">
                {visibleItems.map((request: any) => (
                    <RequestCard
                        key={request.id}
                        request={request}
                        isSelected={selectedIds.includes(request.id)}
                        canDelete={canDelete}
                        isDeleting={deletingId === request.id}
                        onToggleSelect={() => onToggleSelect(request.id)}
                        onDelete={(e) => onDelete(e, request)}
                    />
                ))}
            </div>

            {hasMore && (
                <div ref={ref} className="flex justify-center py-8">
                    {loading && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}
                </div>
            )}

            {!hasMore && visibleItems.length > 0 && (
                <p className="text-center text-zinc-500 py-8 text-sm font-medium">
                    Toutes vos demandes ont été chargées
                </p>
            )}

            {visibleItems.length === 0 && !isSyncing && (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                    <Info className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">Aucune demande trouvée</p>
                    <button
                        onClick={onRefresh}
                        className="text-indigo-400 mt-2 text-sm font-bold hover:text-indigo-300 transition-colors"
                    >
                        Actualiser
                    </button>
                </div>
            )}
        </>
    )
}
