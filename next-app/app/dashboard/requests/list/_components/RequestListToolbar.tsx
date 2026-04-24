'use client'

import { CheckSquare, Square, RefreshCw, Trash2, X, Loader2 } from 'lucide-react'

interface RequestListToolbarProps {
    canSync: boolean
    canDelete: boolean
    selectedCount: number
    totalCount: number
    allSelected: boolean
    isBulkDeleting: boolean
    isSyncing: boolean
    onToggleSelectAll: () => void
    onClearSelection: () => void
    onBulkDelete: () => void
    onSync: () => void
    onRefresh: () => void
}

/**
 * Barre d'actions au-dessus de la liste des demandes :
 * bulk delete (si selection), select all, sync, refresh.
 */
export function RequestListToolbar({
    canSync,
    canDelete,
    selectedCount,
    totalCount,
    allSelected,
    isBulkDeleting,
    isSyncing,
    onToggleSelectAll,
    onClearSelection,
    onBulkDelete,
    onSync,
    onRefresh,
}: RequestListToolbarProps) {
    const showBulkBar = canDelete && selectedCount > 0

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                {showBulkBar && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                        <button
                            onClick={onBulkDelete}
                            disabled={isBulkDeleting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                        >
                            {isBulkDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Supprimer ({selectedCount})
                        </button>
                        <button
                            onClick={onClearSelection}
                            className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white transition-all"
                            title="Annuler la sélection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {canDelete && (
                    <button
                        onClick={onToggleSelectAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm font-medium"
                    >
                        {allSelected && totalCount > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        Tout sélectionner
                    </button>
                )}

                {canSync && (
                    <button
                        onClick={onSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Synchroniser
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm disabled:opacity-50 font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>
        </div>
    )
}
