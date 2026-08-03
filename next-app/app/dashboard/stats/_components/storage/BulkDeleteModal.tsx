'use client'

import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'

interface BulkDeleteModalProps {
    items: StorageItem[]
    deleteFromArr: boolean
    onDeleteFromArrChange: (value: boolean) => void
    isDeleting: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Modale de confirmation pour la suppression groupée de plusieurs médias.
 * Pour les séries, la série entière est supprimée (résidus Sonarr/Radarr
 * et demandes locales inclus, comme pour une suppression unitaire).
 */
export function BulkDeleteModal({
    items,
    deleteFromArr,
    onDeleteFromArrChange,
    isDeleting,
    onConfirm,
    onCancel,
}: BulkDeleteModalProps) {
    const movieCount = items.filter(i => i.type === 'Movie').length
    const seriesCount = items.filter(i => i.type === 'Series').length

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A]/95 border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden ring-1 ring-red-500/20 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-500"></div>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                        <AlertTriangle className="text-red-500 w-5 h-5" />
                    </div>
                    Supprimer {items.length} média{items.length > 1 ? 's' : ''}
                </h3>

                <p className="text-gray-300 mb-4 mt-4 leading-relaxed">
                    Vous êtes sur le point de supprimer
                    <span className="font-bold text-white">
                        {movieCount > 0 && ` ${movieCount} film${movieCount > 1 ? 's' : ''}`}
                        {movieCount > 0 && seriesCount > 0 && ' et'}
                        {seriesCount > 0 && ` ${seriesCount} série${seriesCount > 1 ? 's' : ''} (complète${seriesCount > 1 ? 's' : ''})`}
                    </span>
                    .
                </p>

                <div className="max-h-40 overflow-y-auto mb-4 rounded-lg border border-white/5 bg-white/5 divide-y divide-white/5">
                    {items.map(item => (
                        <div key={item.id} className="px-3 py-2 text-sm text-gray-300 flex items-center justify-between gap-2">
                            <span className="truncate">{item.name}</span>
                            <span className={`text-[10px] uppercase tracking-wider shrink-0 ${item.type === 'Movie' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                {item.type === 'Movie' ? 'Film' : 'Série'}
                            </span>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-red-400 mb-4 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                    <AlertTriangle size={12} />
                    Action irréversible : les fichiers seront supprimés.
                </p>

                <div
                    className="bg-black/30 p-4 rounded-xl mb-6 flex items-start gap-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() => onDeleteFromArrChange(!deleteFromArr)}
                >
                    <div className="mt-0.5 relative flex items-center">
                        <input
                            type="checkbox"
                            id="bulkDeleteArr"
                            checked={deleteFromArr}
                            onChange={(e) => onDeleteFromArrChange(e.target.checked)}
                            className="w-5 h-5 rounded-md border-gray-600 text-red-500 focus:ring-red-500/50 bg-gray-800 transition-all cursor-pointer"
                        />
                    </div>
                    <label htmlFor="bulkDeleteArr" className="text-sm text-gray-300 cursor-pointer select-none flex-1">
                        <span className="font-bold text-white block mb-0.5">Arrêter le suivi (Recommandé)</span>
                        Supprime également la surveillance dans Radarr/Sonarr pour éviter le re-téléchargement.
                    </label>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        disabled={isDeleting}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isDeleting ? 'Suppression...' : `Supprimer (${items.length})`}
                    </button>
                </div>
            </div>
        </div>
    )
}
