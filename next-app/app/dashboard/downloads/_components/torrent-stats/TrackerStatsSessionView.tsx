'use client'

import { Activity, ArrowDown, ArrowUp, Globe } from 'lucide-react'
import { formatStatsSize } from '../../_utils/stats-formatters'
import type { SessionTrackerStat } from '../../_hooks/useTrackerStatsModal'

interface TrackerStatsSessionViewProps {
    trackerStats: SessionTrackerStat[]
}

/** Affiche les stats par tracker pour la session courante (avec barre de ratio). */
export function TrackerStatsSessionView({ trackerStats }: TrackerStatsSessionViewProps) {
    if (trackerStats.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400">Aucune donnée de session disponible pour le moment.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                {trackerStats.map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-bold text-white truncate max-w-[250px]">{item.tracker}</span>
                            </div>
                            <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-gray-400">
                                {item.count} torrent{item.count > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wider">Téléchargé</p>
                                <div className="flex items-center gap-2">
                                    <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-sm font-bold text-white font-mono">{formatStatsSize(item.downloaded)}</span>
                                </div>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wider">Envoyé</p>
                                <div className="flex items-center gap-2">
                                    <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-sm font-bold text-white font-mono">{formatStatsSize(item.uploaded)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500/50"
                                style={{
                                    width: `${Math.min(100, (item.uploaded / (item.downloaded || 1)) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
