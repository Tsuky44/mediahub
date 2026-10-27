'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, X } from 'lucide-react'
import type { StorageItem, SeasonDetail, StorageSort, BulkDeleteProgress } from '../_types/storage'
import { useStorageItems } from '../_hooks/useStorageItems'
import { StorageTable } from './storage/StorageTable'
import { StorageDetailsModal } from './storage/StorageDetailsModal'
import { DeleteStorageModal } from './storage/DeleteStorageModal'
import { BulkDeleteModal } from './storage/BulkDeleteModal'
import { BulkDeleteResultModal } from './storage/BulkDeleteResultModal'
import { StorageManagerHeader } from './storage-manager/StorageManagerHeader'
import { StorageFilterBar } from './storage-manager/StorageFilterBar'
import { useStorageManager } from './storage-manager/useStorageManager'
import { countActiveFilters } from '../_utils/storage-filters'
import { formatBytes } from '../_utils/storage-formatters'

export function StorageManager({ canDelete = false }: { canDelete?: boolean }) {
    const [activeTab, setActiveTab] = useState<'Movie' | 'Series'>('Movie')
    const [sort, setSort] = useState<StorageSort | null>(null)

    const {
        searchTerm,
        setSearchTerm,
        debouncedSearch,
        filters,
        setFilters,
        debouncedFilters,
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
        matchedSize,
        refreshing,
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
    } = useStorageItems(activeTab, debouncedSearch, sort, debouncedFilters)

    const totalSize = totals.all
    const categorySize = activeTab === 'Movie' ? totals.movies : totals.series

    // Sélection multiple.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showBulkDelete, setShowBulkDelete] = useState(false)
    const [bulkDeleteFromArr, setBulkDeleteFromArr] = useState(true)
    const [bulkProgress, setBulkProgress] = useState<BulkDeleteProgress | null>(null)
    const [stopRequested, setStopRequested] = useState(false)
    const bulkAbort = useRef<AbortController | null>(null)
    const [bulkDeleteResult, setBulkDeleteResult] = useState<{
        successCount: number
        failedCount: number
        skippedCount: number
        freedBytes: number
    } | null>(null)
    // Médias figés au lancement : la liste de la modale ne bouge pas pendant que
    // les lignes supprimées disparaissent du tableau.
    const [bulkTargets, setBulkTargets] = useState<StorageItem[]>([])

    useEffect(() => {
        setSelectedIds(new Set())
    }, [activeTab, debouncedSearch, sort, debouncedFilters])

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
    const selectedSize = useMemo(
        () => selectedItems.reduce((acc, i) => acc + (i.size || 0), 0),
        [selectedItems]
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
        setBulkTargets(selectedItems)
        setShowBulkDelete(true)
    }

    const confirmBulkDelete = async () => {
        const controller = new AbortController()
        bulkAbort.current = controller
        setStopRequested(false)
        const result = await deleteMultiple(bulkTargets, bulkDeleteFromArr, {
            signal: controller.signal,
            onProgress: setBulkProgress,
        })
        bulkAbort.current = null
        setBulkProgress(null)
        setShowBulkDelete(false)
        setSelectedIds(new Set())
        if (result.success > 0) {
            setBulkDeleteResult({
                successCount: result.success,
                failedCount: result.failed,
                skippedCount: bulkTargets.length - result.processed,
                freedBytes: result.freedBytes,
            })
        }
    }

    const stopBulkDelete = () => {
        setStopRequested(true)
        bulkAbort.current?.abort()
    }

    const selectionBar = selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">
                    {selectedIds.size} média{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                    <span className="ml-2 text-purple-300 font-semibold" title="Espace libéré si la sélection est supprimée">
                        • {formatBytes(selectedSize)}
                    </span>
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
    )

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

            {/* Filtres et sélection restent visibles pendant le défilement (-top-6 : padding du conteneur) */}
            <div className="sticky -top-6 z-20 -mx-6 px-6 py-3 space-y-3 bg-gray-950/90 backdrop-blur-md border-b border-white/5">
                <StorageFilterBar
                    filters={filters}
                    onChange={setFilters}
                    resultCount={loading ? null : pagination.total}
                    resultSize={loading ? null : matchedSize}
                    refreshing={refreshing}
                />
                {selectionBar}
            </div>

            <StorageTable
                items={items}
                loading={loading}
                refreshing={refreshing}
                loadingLabel={
                    countActiveFilters(debouncedFilters) > 0 || sort
                        ? 'Analyse de toute la bibliothèque…'
                        : undefined
                }
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

            {showBulkDelete && bulkTargets.length > 0 && (
                <BulkDeleteModal
                    items={bulkTargets}
                    deleteFromArr={bulkDeleteFromArr}
                    onDeleteFromArrChange={setBulkDeleteFromArr}
                    progress={bulkProgress}
                    stopRequested={stopRequested}
                    onConfirm={confirmBulkDelete}
                    onCancel={() => setShowBulkDelete(false)}
                    onStop={stopBulkDelete}
                />
            )}

            {bulkDeleteResult && (
                <BulkDeleteResultModal
                    successCount={bulkDeleteResult.successCount}
                    failedCount={bulkDeleteResult.failedCount}
                    skippedCount={bulkDeleteResult.skippedCount}
                    freedBytes={bulkDeleteResult.freedBytes}
                    onClose={() => setBulkDeleteResult(null)}
                />
            )}
        </div>
    )
}
