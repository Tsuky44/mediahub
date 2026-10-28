'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, Loader2, CheckCircle2, XCircle, Circle, MinusCircle, Square } from 'lucide-react'
import type { BulkDeleteItemStatus, BulkDeleteProgress, StorageItem } from '../../_types/storage'
import { formatBytes } from '../../_utils/storage-formatters'

interface BulkDeleteModalProps {
    items: StorageItem[]
    deleteFromArr: boolean
    onDeleteFromArrChange: (value: boolean) => void
    /** Avancement de la suppression, null tant qu'elle n'a pas commencé */
    progress: BulkDeleteProgress | null
    stopRequested: boolean
    onConfirm: () => void
    onCancel: () => void
    onStop: () => void
}

function StatusIcon({ status }: { status: BulkDeleteItemStatus }) {
    switch (status) {
        case 'deleting': return <Loader2 className="w-4 h-4 text-red-400 animate-spin shrink-0" />
        case 'done': return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        case 'failed': return <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
        case 'skipped': return <MinusCircle className="w-4 h-4 text-gray-600 shrink-0" />
        default: return <Circle className="w-4 h-4 text-gray-700 shrink-0" />
    }
}

/**
 * Modale de suppression groupée : confirmation, puis avancement en direct
 * (barre de progression, média en cours, statut de chaque média).
 * Pour les séries, la série entière est supprimée (résidus Sonarr/Radarr
 * et demandes locales inclus, comme pour une suppression unitaire).
 */
export function BulkDeleteModal({
    items,
    deleteFromArr,
    onDeleteFromArrChange,
    progress,
    stopRequested,
    onConfirm,
    onCancel,
    onStop,
}: BulkDeleteModalProps) {
    const movieCount = items.filter(i => i.type === 'Movie').length
    const seriesCount = items.filter(i => i.type === 'Series').length
    const totalSize = items.reduce((acc, i) => acc + (i.size || 0), 0)
    const running = progress !== null
    const percent = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

    // Garde le média en cours de suppression visible dans la liste
    const listRef = useRef<HTMLDivElement>(null)
    const currentId = progress
        ? Object.keys(progress.statuses).find(id => progress.statuses[id] === 'deleting')
        : undefined
    useEffect(() => {
        if (!currentId) return
        listRef.current
            ?.querySelector(`[data-item-id="${CSS.escape(currentId)}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [currentId])

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#080909]/95 border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden ring-1 ring-red-500/20 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-500"></div>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                        {running
                            ? <Loader2 className="text-red-500 w-5 h-5 animate-spin" />
                            : <AlertTriangle className="text-red-500 w-5 h-5" />}
                    </div>
                    {running
                        ? 'Suppression en cours…'
                        : `Supprimer ${items.length} média${items.length > 1 ? 's' : ''}`}
                </h3>

                {running ? (
                    <div className="mt-4 mb-4 space-y-2">
                        <div className="flex items-baseline justify-between text-sm">
                            <span className="text-white font-medium">
                                {progress.processed} / {progress.total}
                            </span>
                            <span className="text-emerald-400 font-medium">
                                {formatBytes(progress.freedBytes)} libérés
                            </span>
                        </div>
                        <div
                            className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={progress.total}
                            aria-valuenow={progress.processed}
                        >
                            <div
                                className="relative h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-[width] duration-500 ease-out overflow-hidden"
                                style={{ width: `${Math.max(percent, 3)}%` }}
                            >
                                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-indeterminate" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 truncate min-h-4">
                            {stopRequested
                                ? 'Arrêt après le média en cours…'
                                : progress.currentName
                                    ? <>Suppression de <span className="text-gray-200">{progress.currentName}</span></>
                                    : 'Finalisation…'}
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-300 mb-4 mt-4 leading-relaxed">
                        Vous êtes sur le point de supprimer
                        <span className="font-bold text-white">
                            {movieCount > 0 && ` ${movieCount} film${movieCount > 1 ? 's' : ''}`}
                            {movieCount > 0 && seriesCount > 0 && ' et'}
                            {seriesCount > 0 && ` ${seriesCount} série${seriesCount > 1 ? 's' : ''} (complète${seriesCount > 1 ? 's' : ''})`}
                        </span>
                        {' '}soit <span className="font-bold text-white">{formatBytes(totalSize)}</span>.
                    </p>
                )}

                <div ref={listRef} className="max-h-48 overflow-y-auto overscroll-contain mb-4 rounded-lg border border-white/5 bg-white/5 divide-y divide-white/5">
                    {items.map(item => {
                        const status = progress?.statuses[item.id] ?? 'pending'
                        return (
                            <div
                                key={item.id}
                                data-item-id={item.id}
                                className={`px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                                    status === 'deleting' ? 'bg-red-500/10 text-white' : status === 'done' ? 'text-gray-500' : 'text-gray-300'
                                }`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    {running && <StatusIcon status={status} />}
                                    <span className={`truncate ${status === 'done' ? 'line-through' : ''}`}>{item.name}</span>
                                </span>
                                <span className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] text-gray-500 font-mono">{formatBytes(item.size)}</span>
                                    <span className={`text-[10px] uppercase tracking-wider ${item.type === 'Movie' ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {item.type === 'Movie' ? 'Film' : 'Série'}
                                    </span>
                                </span>
                            </div>
                        )
                    })}
                </div>

                {!running && (
                    <>
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
                    </>
                )}

                <div className="flex justify-end gap-3">
                    {running ? (
                        <button
                            onClick={onStop}
                            disabled={stopRequested}
                            className="px-4 py-2 text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Termine le média en cours puis s'arrête"
                        >
                            <Square className="w-4 h-4" />
                            Interrompre
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {`Supprimer (${items.length})`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
