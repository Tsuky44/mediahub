'use client'

import { Loader2, Info } from 'lucide-react'

import { useInfiniteRequests } from './_hooks/useInfiniteRequests'
import { useRequestSelection } from './_hooks/useRequestSelection'
import { useRequestFilters } from './_hooks/useRequestFilters'
import { RequestListToolbar } from './_components/RequestListToolbar'
import { RequestFilters } from './_components/RequestFilters'
import { RequestListItems } from './_components/RequestListItems'

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

    const {
        mediaType,
        ownership,
        searchQuery,
        setMediaType,
        setOwnership,
        setSearchQuery,
        filteredItems,
        activeFilterCount,
    } = useRequestFilters()

    const visibleItems = filteredItems(items)

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
            <div className="space-y-4">
                <RequestFilters
                    mediaType={mediaType}
                    ownership={ownership}
                    searchQuery={searchQuery}
                    activeCount={activeFilterCount}
                    onMediaTypeChange={setMediaType}
                    onOwnershipChange={setOwnership}
                    onSearchChange={setSearchQuery}
                    onClearFilters={() => {
                        setMediaType('all')
                        setOwnership('all')
                        setSearchQuery('')
                    }}
                />
                <RequestListToolbar
                    canSync={canSync}
                    canDelete={canDelete}
                    selectedCount={selectedIds.length}
                    totalCount={visibleItems.length}
                    allSelected={selectedIds.length === visibleItems.length}
                    isBulkDeleting={isBulkDeleting}
                    isSyncing={isSyncing}
                    onToggleSelectAll={() => toggleSelectAll(visibleItems.map((i: any) => i.id))}
                    onClearSelection={clearSelection}
                    onBulkDelete={handleBulkDelete}
                    onSync={sync}
                    onRefresh={refresh}
                />
            </div>

            <RequestListItems
                visibleItems={visibleItems}
                hasMore={hasMore}
                loading={loading}
                isSyncing={isSyncing}
                selectedIds={selectedIds}
                deletingId={deletingId}
                canDelete={canDelete}
                onToggleSelect={toggleSelection}
                onDelete={handleDeleteOne}
                onLoadMore={loadMore}
                onRefresh={refresh}
            />
        </div>
    )
}
