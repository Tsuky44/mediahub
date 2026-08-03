'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { StorageItem, StorageSort, StorageSortKey } from '../../_types/storage'
import { StorageTableRow } from './StorageTableRow'
import { StorageMobileItem } from './StorageMobileItem'

interface StorageTableProps {
    items: StorageItem[]
    loading: boolean
    sort: StorageSort | null
    onSortChange: (sort: StorageSort | null) => void
    onSelect: (item: StorageItem) => void
    onDelete: (item: StorageItem, e: React.MouseEvent) => void
    selectedIds: Set<string>
    onToggleSelect: (id: string) => void
    onToggleSelectAll: (items: StorageItem[]) => void
}

/**
 * Liste des medias stockes (vue table desktop + liste mobile).
 * Le tri est effectué côté serveur sur toute la bibliothèque.
 */
export function StorageTable({
    items,
    loading,
    sort,
    onSortChange,
    onSelect,
    onDelete,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
}: StorageTableProps) {
    const toggleSort = (key: StorageSortKey) => {
        onSortChange((() => {
            if (sort?.key !== key) return { key, dir: 'desc' }
            if (sort.dir === 'desc') return { key, dir: 'asc' }
            return null
        })())
    }

    const renderSortIndicator = (key: StorageSortKey) => {
        if (sort?.key !== key) return null
        return sort.dir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
    }

    const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id))
    const someSelected = items.some(i => selectedIds.has(i.id))

    return (
        <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase tracking-wider text-xs">
                        <tr>
                            <th className="pl-6 pr-2 py-5 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = !allSelected && someSelected
                                    }}
                                    onChange={() => onToggleSelectAll(items)}
                                    className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500/50 bg-gray-800 cursor-pointer"
                                    title="Tout sélectionner"
                                />
                            </th>
                            <th className="px-6 py-5">Média</th>
                            <th className="px-6 py-5 text-right">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('size')}
                                    className={`inline-flex items-center gap-1 uppercase tracking-wider font-bold transition-colors hover:text-white ${sort?.key === 'size' || !sort ? 'text-white' : ''}`}
                                    title="Trier par taille (toute la bibliothèque)"
                                >
                                    Taille
                                    {renderSortIndicator('size')}
                                </button>
                            </th>
                            <th className="px-6 py-5 text-center">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('lastPlayed')}
                                    className={`inline-flex items-center gap-1 uppercase tracking-wider font-bold transition-colors hover:text-white ${sort?.key === 'lastPlayed' ? 'text-white' : ''}`}
                                    title="Trier par date de dernière lecture (toute la bibliothèque)"
                                >
                                    Regardé
                                    {renderSortIndicator('lastPlayed')}
                                </button>
                            </th>
                            <th className="px-6 py-5 text-center">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('requested')}
                                    className={`inline-flex items-center gap-1 uppercase tracking-wider font-bold transition-colors hover:text-white ${sort?.key === 'requested' ? 'text-white' : ''}`}
                                    title="Trier par date de demande (toute la bibliothèque)"
                                >
                                    Demandé
                                    {renderSortIndicator('requested')}
                                </button>
                            </th>
                            <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Chargement des données...
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                    Aucun média trouvé
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <StorageTableRow
                                    key={item.id}
                                    item={item}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                    selected={selectedIds.has(item.id)}
                                    onToggleSelect={onToggleSelect}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-white/5">
                {loading ? (
                    <div className="px-6 py-8 text-center text-gray-400">
                        Chargement des données...
                    </div>
                ) : items.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400">
                        Aucun média trouvé
                    </div>
                ) : (
                    items.map((item) => (
                        <StorageMobileItem
                            key={item.id}
                            item={item}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            selected={selectedIds.has(item.id)}
                            onToggleSelect={onToggleSelect}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
