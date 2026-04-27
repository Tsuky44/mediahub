'use client'

import { CheckCircle2, Download, Loader2 } from 'lucide-react'

interface ProwlarrBulkBarProps {
    selectedCount: number
    bulkDownloading: boolean
    onBulkDownload: () => void
}

/** Barre d'actions affichee quand l'utilisateur a selectionne des releases. */
export function ProwlarrBulkBar({ selectedCount, bulkDownloading, onBulkDownload }: ProwlarrBulkBarProps) {
    if (selectedCount === 0) return null
    return (
        <div className="flex items-center justify-between p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 text-indigo-300 font-medium text-sm">
                <CheckCircle2 className="h-5 w-5" />
                {selectedCount} torrent{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </div>
            <button
                onClick={onBulkDownload}
                disabled={bulkDownloading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
                {bulkDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger la sélection
            </button>
        </div>
    )
}
