'use client'

import type { StorageItem } from '../../_types/storage'
import { StorageTableRow } from './StorageTableRow'
import { StorageMobileItem } from './StorageMobileItem'

interface StorageTableProps {
    items: StorageItem[]
    loading: boolean
    onSelect: (item: StorageItem) => void
    onDelete: (item: StorageItem, e: React.MouseEvent) => void
}

/**
 * Liste des medias stockes (vue table desktop + liste mobile).
 */
export function StorageTable({ items, loading, onSelect, onDelete }: StorageTableProps) {
    return (
        <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-6 py-5">Média</th>
                            <th className="px-6 py-5 text-right">Taille</th>
                            <th className="px-6 py-5 text-center">État</th>
                            <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                    Chargement des données...
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
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
                        />
                    ))
                )}
            </div>
        </div>
    )
}
