'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { HardDrive, Film, Tv, Search, RefreshCw } from 'lucide-react'
import type { StorageItem, SeasonDetail, DeleteTarget } from '../_types/storage'
import { formatBytes } from '../_utils/storage-formatters'
import { useStorageItems } from '../_hooks/useStorageItems'
import { StorageTable } from './storage/StorageTable'
import { StorageDetailsModal } from './storage/StorageDetailsModal'
import { DeleteStorageModal } from './storage/DeleteStorageModal'

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

    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'Movie' | 'Series'>('Movie')

    // Delete modal state
    const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null)
    const [deleteFromArr, setDeleteFromArr] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)

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

    const filteredItems = items.filter(item =>
        item.type === activeTab &&
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const totalSize = items.reduce((acc, item) => acc + item.size, 0)
    const categorySize = items.filter(i => i.type === activeTab).reduce((acc, item) => acc + item.size, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <HardDrive className="text-purple-400" />
                        Gestion du Stockage
                    </h2>
                    <p className="text-sm text-gray-400">
                        Total : <span className="text-white font-medium">{formatBytes(totalSize)}</span>
                        {' • '}
                        <span className={activeTab === 'Movie' ? 'text-blue-400' : 'text-green-400'}>
                            {activeTab === 'Movie' ? 'Films' : 'Séries'} : {formatBytes(categorySize)}
                        </span>
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Tabs */}
                    <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/5">
                        <button
                            onClick={() => setActiveTab('Movie')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'Movie'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Film size={16} />
                                Films
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('Series')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'Series'
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Tv size={16} />
                                Séries
                            </span>
                        </button>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                    </div>
                    <button
                        onClick={refetch}
                        className="p-2.5 bg-black/40 backdrop-blur-sm border border-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm hover:shadow-md"
                        title="Actualiser"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

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
