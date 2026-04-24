'use client'

import { ExternalLink, Download, AlertCircle, Plus, X } from 'lucide-react'

interface TrackerActionsBarProps {
    showForm: boolean
    importing: boolean
    onToggleForm: () => void
    onImport: () => void
    onDebug: () => void
}

/** Barre d'actions au-dessus de la liste des trackers : import, debug, add/cancel. */
export function TrackerActionsBar({
    showForm,
    importing,
    onToggleForm,
    onImport,
    onDebug,
}: TrackerActionsBarProps) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-emerald-400" />
                Configuration des Trackers
            </h3>
            <div className="flex gap-2">
                <button
                    onClick={onImport}
                    disabled={importing}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    <Download className={`w-4 h-4 ${importing ? 'animate-bounce' : ''}`} />
                    Importer depuis Prowlarr
                </button>
                <button
                    onClick={onDebug}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    title="Afficher les données brutes de Prowlarr dans la console"
                >
                    <AlertCircle className="w-4 h-4" />
                    Debug
                </button>
                <button
                    onClick={onToggleForm}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    {showForm ? (
                        <>
                            <X className="w-4 h-4" /> Annuler
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" /> Ajouter
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
