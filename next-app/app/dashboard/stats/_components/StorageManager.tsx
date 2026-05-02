'use client'

import { toast } from 'react-hot-toast'
import type { StorageItem, SeasonDetail, DeleteTarget } from '../_types/storage'
import { useStorageItems } from '../_hooks/useStorageItems'
import { StorageTable } from './storage/StorageTable'
import { StorageDetailsModal } from './storage/StorageDetailsModal'
import { DeleteStorageModal } from './storage/DeleteStorageModal'
import { StorageManagerHeader } from './storage-manager/StorageManagerHeader'
import { useStorageManager } from './storage-manager/useStorageManager'

export function StorageManager({ canDelete = false }: { canDelete?: boolean }) {
    const {
        items,
        loading,
        selectedItem,
        details,
        loadingDetails,
        refetch,
        openDetails,
        closeDetails,
        deleteItem,
    } = useStorageItems()

    const {
        searchTerm,
        setSearchTerm,
        activeTab,
        setActiveTab,
        filteredItems,
        totalSize,
        categorySize,
        itemToDelete,
        setItemToDelete,
        deleteFromArr,
        setDeleteFromArr,
        isDeleting,
        setIsDeleting,
    } = useStorageManager(items)

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

    return (
        <div className="space-y-6">
            <StorageManagerHeader
                totalSize={totalSize}
                categorySize={categorySize}
                activeTab={activeTab}
                searchTerm={searchTerm}
                loading={loading}
                onTabChange={setActiveTab}
                onSearchChange={setSearchTerm}
                onRefresh={refetch}
            />

            <StorageTable
                items={filteredItems}
                loading={loading}
                onSelect={openDetails}
                onDelete={(item, e) => openDeleteModal(item, undefined, e)}
            />

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
        </div>
    )
}
