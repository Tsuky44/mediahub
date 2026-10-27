'use client'

import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react'
import type { DeleteTarget } from '../../_types/storage'

interface DeleteStorageModalProps {
    target: DeleteTarget
    deleteFromArr: boolean
    onDeleteFromArrChange: (value: boolean) => void
    isDeleting: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Modale de confirmation pour supprimer un media ou une saison.
 * Propose l'arret du suivi dans Radarr/Sonarr.
 */
export function DeleteStorageModal({
    target,
    deleteFromArr,
    onDeleteFromArrChange,
    isDeleting,
    onConfirm,
    onCancel,
}: DeleteStorageModalProps) {
    const { item, season } = target
    const arrName = item.type === 'Movie' ? 'Radarr' : 'Sonarr'

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0e1010]/95 border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden ring-1 ring-red-500/20 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-500 overflow-hidden">
                    {isDeleting && (
                        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-indeterminate" />
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                        <AlertTriangle className="text-red-500 w-5 h-5" />
                    </div>
                    Confirmation
                </h3>

                <p className="text-gray-300 mb-6 mt-4 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer
                    <span className="font-bold text-white block mt-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        {season ? `${season.name} de ` : ''}{item.name}
                    </span>
                    <span className="text-xs text-red-400 mt-3 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                        <AlertTriangle size={12} />
                        Cette action est irréversible et supprimera les fichiers.
                    </span>
                </p>

                {isDeleting ? (
                <div className="mb-6 space-y-2" role="status">
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden relative">
                        <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-red-600 to-orange-500 animate-indeterminate" />
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Suppression des fichiers{deleteFromArr ? ` et arrêt du suivi dans ${arrName}` : ''}…
                    </p>
                </div>
                ) : (
                <div
                    className="bg-black/30 p-4 rounded-xl mb-6 flex items-start gap-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() => onDeleteFromArrChange(!deleteFromArr)}
                >
                    <div className="mt-0.5 relative flex items-center">
                        <input
                            type="checkbox"
                            id="deleteArr"
                            checked={deleteFromArr}
                            onChange={(e) => onDeleteFromArrChange(e.target.checked)}
                            className="w-5 h-5 rounded-md border-gray-600 text-red-500 focus:ring-red-500/50 bg-gray-800 transition-all cursor-pointer"
                        />
                    </div>
                    <label htmlFor="deleteArr" className="text-sm text-gray-300 cursor-pointer select-none flex-1">
                        <span className="font-bold text-white block mb-0.5">Arrêter le suivi (Recommandé)</span>
                        Supprime également la surveillance dans {arrName} pour éviter le re-téléchargement.
                    </label>
                </div>
                )}

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
                        {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                    </button>
                </div>
            </div>
        </div>
    )
}
