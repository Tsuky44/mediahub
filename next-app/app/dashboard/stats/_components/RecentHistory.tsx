'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { useHistorySocket } from '../_hooks/useHistorySocket'
import { processHistoryItem } from '../_utils/history-formatters'
import { HistoryItem } from './HistoryItem'

interface RecentHistoryProps {
    initialHistory: any[]
}

/**
 * Affiche l'historique recent de visionnage (live + passe).
 * Les mises a jour temps reel sont gerees par `useHistorySocket`.
 * Chaque ligne est rendue par `HistoryItem`.
 */
export function RecentHistory({ initialHistory }: RecentHistoryProps) {
    const { history, isConnected } = useHistorySocket(initialHistory)

    const processedHistory = React.useMemo(
        () => history.slice(0, 50).map(processHistoryItem),
        [history]
    )

    return (
        <div className="onyx-reveal rounded-3xl bg-black/20 p-6 shadow-2xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/20 hover:shadow-indigo-500/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Clock className="h-5 w-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">Historique Récent</h3>
                </div>
                {isConnected && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(119,153,109,0.2)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">En direct</span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {processedHistory.length > 0 ? (
                    processedHistory.map((item, idx) => {
                        const stableKey = item.isLive && item.sessionId
                            ? `live-${item.sessionId}`
                            : `${item.itemId}-${item.date.getTime()}-${item.id || idx}`
                        return <HistoryItem key={stableKey} item={item} />
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-black/20 border border-white/5 border-dashed group hover:border-indigo-500/30 transition-all duration-300 hover:bg-white/[0.02]">
                        <div className="p-5 bg-black/40 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner">
                            <Clock className="h-10 w-10 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-gray-300">Aucun historique récent</p>
                        <p className="text-sm text-gray-500 mt-2 max-w-[250px] font-medium">L&apos;activité apparaîtra ici une fois que du contenu sera visionné</p>
                    </div>
                )}
            </div>
        </div>
    )
}
