'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, X } from 'lucide-react'
import type { StorageItem, SeasonDetail, StorageSort } from '../_types/storage'
import { useStorageItems } from '../_hooks/useStorageItems'
import { StorageTable } from './storage/StorageTable'
import { StorageDetailsModal } from './storage/StorageDetailsModal'
import { DeleteStorageModal } from './storage/DeleteStorageModal'
import { BulkDeleteModal } from './storage/BulkDeleteModal'
import { BulkDeleteResultModal } from './storage/BulkDeleteResultModal'
import { StorageManagerHeader } from './storage-manager/StorageManagerHeader'
import { useStorageManager } from './storage-manager/useStorageManager'

export function StorageManager({ canDelete = false }: { canDelete?: boolean }) {
    const [activeTab, setActiveTab] = useState<'Movie' | 'Series'>('Movie')
    const [sort, setSort] = useState<StorageSort | null>(null)

    const {
        searchTerm,
        setSearchTerm,
        debouncedSearch,
        itemToDelete,
        setItemToDelete,
        deleteFromArr,
        setDeleteFromArr,
        isDeleting,
        setIsDeleting,
    } = useStorageManager()

    const {
        items,
        totals,
        pagination,
        loading,
        loadingMore,
        hasMore,
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
    } = useStorageItems(activeTab, debouncedSearch, sort)

    const totalSize = totals.all
    const categorySize = activeTab === 'Movie' ? totals.movies : totals.series

    // Sélection multiple.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showBulkDelete, setShowBulkDelete] = useState(false)
    const [bulkDeleteFromArr, setBulkDeleteFromArr] = useState(true)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [bulkDeleteResult, setBulkDeleteResult] = useState<{
        successCount: number
        failedCount: number
        freedBytes: number
    } | null>(null)

    useEffect(() => {
        setSelectedIds(new Set())
    }, [activeTab, debouncedSearch, sort])

    useEffect(() => {
        setSelectedIds(prev => {
            const validIds = new Set(items.map(i => i.id))
            const next = new Set([...prev].filter(id => validIds.has(id)))
            return next.size === prev.size ? prev : next
        })
    }, [items])

    const selectedItems = useMemo(
        () => items.filter(i => selectedIds.has(i.id)),
        [items, selectedIds]
    )

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = (list: StorageItem[]) => {
        setSelectedIds(prev => {
            const allSelected = list.length > 0 && list.every(i => prev.has(i.id))
            const next = new Set(prev)
            if (allSelected) list.forEach(i => next.delete(i.id))
            else list.forEach(i => next.add(i.id))
            return next
        })
    }

    const openDeleteModal = (item: StorageItem, season?: SeasonDetail, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (item.isPlaying) {
            toast.error(`Impossible de supprimer : ${item.activeUser} regarde ce contenu actuellement !`)
            return
        }
        setItemToDelete({ item, season })
        setDeleteFromArr(true)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        setIsDeleting(true)
        const ok = await deleteItem({ ...itemToDelete, deleteFromArr })
        setIsDeleting(false)
        if (ok) setItemToDelete(null)
    }

    const openBulkDelete = () => {
        const playing = selectedItems.filter(i => i.isPlaying)
        if (playing.length > 0) {
            toast.error(`${playing.length} média(s) en cours de lecture ne peuvent pas être supprimés.`)
        }
        setBulkDeleteFromArr(true)
        setShowBulkDelete(true)
    }

    const confirmBulkDelete = async () => {
        setIsBulkDeleting(true)
        const result = await deleteMultiple(selectedItems, bulkDeleteFromArr)
        setIsBulkDeleting(false)
        setShowBulkDelete(false)
        setSelectedIds(new Set())
        if (result.success > 0) {
            setBulkDeleteResult({
                successCount: result.success,
                failedCount: result.failed,
                freedBytes: result.freedBytes,
            })
        }
    }

    return (
        <div className="space-y-6">
            <StorageManagerHeader
                totalSize={totalSize}
                categorySize={categorySize}
                totalsPending={cacheBuilding}
                activeTab={activeTab}
                searchTerm={searchTerm}
                loading={loading}
                syncing={syncing}
                onTabChange={setActiveTab}
                onSearchChange={setSearchTerm}
                onRefresh={refetch}
                onSync={syncLastPlayed}
            />

            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                            {selectedIds.size} média{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={14} />
                            Tout désélectionner
                        </button>
                    </div>
                    <button
                        onClick={openBulkDelete}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Supprimer la sélection
                    </button>
                </div>
            )}

            <StorageTable
                items={items}
                loading={loading}
                sort={sort}
                onSortChange={setSort}
                onSelect={openDetails}
                onDelete={(item, e) => openDeleteModal(item, undefined, e)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
            />

            {!loading && items.length > 0 && (
                <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-xs text-gray-500">
                        {items.length} sur {pagination.total} média{pagination.total > 1 ? 's' : ''}
                    </p>
                    {hasMore && (
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Chargement...
                                </>
                            ) : (
                                'Charger plus'
                            )}
                        </button>
                    )}
                </div>
            )}

            {selectedItem && (
                <StorageDetailsModal
                    item={selectedItem}
                    details={details}
                    loading={loadingDetails}
                    canDelete={canDelete}
                    onClose={closeDetails}
                    onDeleteItem={() => openDeleteModal(selectedItem)}
                    onDeleteSeason={(season) => openDeleteModal(selectedItem, season)}
                />
            )}

            {itemToDelete && (
                <DeleteStorageModal
                    target={itemToDelete}
                    deleteFromArr={deleteFromArr}
                    onDeleteFromArrChange={setDeleteFromArr}
                    isDeleting={isDeleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setItemToDelete(null)}
                />
            )}

            {showBulkDelete && selectedItems.length > 0 && (
                <BulkDeleteModal
                    items={selectedItems}
                    deleteFromArr={bulkDeleteFromArr}
                    onDeleteFromArrChange={setBulkDeleteFromArr}
                    isDeleting={isBulkDeleting}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setShowBulkDelete(false)}
                />
            )}

            {bulkDeleteResult && (
                <BulkDeleteResultModal
                    successCount={bulkDeleteResult.successCount}
                    failedCount={bulkDeleteResult.failedCount}
                    freedBytes={bulkDeleteResult.freedBytes}
                    onClose={() => setBulkDeleteResult(null)}
                />
            )}
        </div>
    )
}
