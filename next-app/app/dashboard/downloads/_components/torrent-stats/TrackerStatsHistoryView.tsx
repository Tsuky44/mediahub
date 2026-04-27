'use client'

import { ArrowDown, ArrowUp, Calendar, Globe, History } from 'lucide-react'
import { formatStatsSize } from '../../_utils/stats-formatters'
import type { HistoryEntry } from '../../_hooks/useTrackerStatsModal'

interface TrackerStatsHistoryViewProps {
    history: HistoryEntry[]
}

/** Affiche l'historique des stats par tracker, regroupes par jour. */
export function TrackerStatsHistoryView({ history }: TrackerStatsHistoryViewProps) {
    if (history.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">Historique indisponible</p>
                <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                    Les données sont collectées quotidiennement. Revenez demain pour voir l&apos;historique.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {history.map((day, idx) => (
                <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2 sticky top-0 bg-[#0f172a] py-2 z-10 border-b border-white/5">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="capitalize">
                            {new Date(day.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                        </span>
                    </h4>
                    <div className="space-y-2">
                        {day.stats.map((stat, sIdx) => (
                            <div
                                key={sIdx}
                                className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-1.5 bg-black/20 rounded-lg">
                                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-bold text-white truncate max-w-[150px] md:max-w-[200px]">
                                        {stat.tracker}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDown className="w-3 h-3 text-emerald-500" />
                                        <span className="text-gray-300">{formatStatsSize(stat.downloaded)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ArrowUp className="w-3 h-3 text-blue-500" />
                                        <span className="text-gray-300">{formatStatsSize(stat.uploaded)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
