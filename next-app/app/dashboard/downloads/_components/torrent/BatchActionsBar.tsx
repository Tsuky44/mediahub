'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, Trash2, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Signal, Clock, X } from 'lucide-react'
import clsx from 'clsx'

export type BatchAction = 'resume' | 'pause' | 'delete' | 'top' | 'up' | 'down' | 'bottom' | 'reannounce'

interface BatchActionsBarProps {
    selectedCount: number
    onBatchAction: (action: BatchAction) => void | Promise<void>
    onShareLimitClick: () => void
    onClearSelection: () => void
}

export function BatchActionsBar({
    selectedCount,
    onBatchAction,
    onShareLimitClick,
    onClearSelection,
}: BatchActionsBarProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted) return null

    return createPortal(
        <div className={clsx(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center gap-2 transition-all duration-300 origin-bottom",
            selectedCount > 0 ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-90 pointer-events-none"
        )}>
            <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/5 text-xs font-bold text-white flex items-center gap-2 mr-2">
                <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-md text-[10px]">{selectedCount}</span>
                <span className="hidden sm:inline">sélectionnés</span>
            </div>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <button onClick={() => onBatchAction('resume')} className="p-2 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl transition-colors" title="Reprendre">
                <Play className="w-5 h-5 fill-current" />
            </button>
            <button onClick={() => onBatchAction('pause')} className="p-2 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl transition-colors" title="Pause">
                <Pause className="w-5 h-5 fill-current" />
            </button>
            <button onClick={() => onBatchAction('delete')} className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors" title="Supprimer">
                <Trash2 className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-white/10 mx-1" />

            {/* Priority Controls */}
            <div className="flex items-center gap-1">
                <button onClick={() => onBatchAction('top')} className="p-2 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition-colors" title="Priorité Max (Top)">
                    <ChevronsUp className="w-5 h-5" />
                </button>
                <button onClick={() => onBatchAction('up')} className="p-2 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition-colors" title="Augmenter Priorité">
                    <ChevronUp className="w-5 h-5" />
                </button>
                <button onClick={() => onBatchAction('down')} className="p-2 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition-colors" title="Diminuer Priorité">
                    <ChevronDown className="w-5 h-5" />
                </button>
                <button onClick={() => onBatchAction('bottom')} className="p-2 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl transition-colors" title="Priorité Min (Bas)">
                    <ChevronsDown className="w-5 h-5" />
                </button>
            </div>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <button onClick={() => onBatchAction('reannounce')} className="p-2 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-xl transition-colors" title="Réannoncer">
                <Signal className="w-5 h-5" />
            </button>
            <button onClick={onShareLimitClick} className="p-2 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 rounded-xl transition-colors" title="Définir la limite de temps (ETA)">
                <Clock className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <button onClick={onClearSelection} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors" title="Annuler sélection">
                <X className="w-5 h-5" />
            </button>
        </div>,
        document.body
    )
}
