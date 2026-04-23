'use client'

import { Film, Tv, Play, Trash2 } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'
import { formatBytes } from '../../_utils/storage-formatters'

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
                                <tr
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{item.name}</div>
                                                {item.type === 'Series' && (
                                                    <div className="text-xs text-gray-500">{item.episodesCount} épisodes</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-300 font-mono">
                                        {formatBytes(item.size)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.isPlaying ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                <Play size={10} className="fill-current" />
                                                Lecture par {item.activeUser}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => onDelete(item, e)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
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
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="p-4 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10"
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-white truncate pr-2">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{formatBytes(item.size)}</span>
                                            {item.type === 'Series' && (
                                                <>
                                                    <span>•</span>
                                                    <span>{item.episodesCount} épisodes</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => onDelete(item, e)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {item.isPlaying && (
                                <div className="mt-2 flex justify-start">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                        <Play size={10} className="fill-current" />
                                        Lecture par {item.activeUser}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
