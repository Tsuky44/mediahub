'use client'

import { Database, RefreshCw } from 'lucide-react'
import type { TrackerStat } from '../../_types/tracker'
import { getBonusLabel } from '../../_utils/tracker-labels'

interface TrackerStatCardProps {
    stat: TrackerStat
}

function TrackerStatCard({ stat }: TrackerStatCardProps) {
    return (
        <div
            className={`bg-gray-800/50 rounded-lg p-4 border ${stat.enabled ? 'border-white/10' : 'border-gray-700 opacity-60'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{stat.name}</h4>
                <span className={`text-2xl font-bold ${stat.ratioColor}`}>{stat.ratio.toFixed(2)}</span>
            </div>

            <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                    <span>Upload:</span>
                    <span className="text-emerald-400">{stat.uploaded}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                    <span>Download:</span>
                    <span className="text-blue-400">{stat.downloaded}</span>
                </div>
                {stat.bonusPoints !== undefined && (
                    <div className="flex justify-between text-gray-400">
                        <span>{getBonusLabel(stat.name)}:</span>
                        <span className="text-amber-400">{stat.bonusPoints}</span>
                    </div>
                )}
                {stat.seedingCount !== undefined && (
                    <div className="flex justify-between text-gray-400">
                        <span>Seeding:</span>
                        <span className="text-purple-400">{stat.seedingCount}</span>
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
                Mis à jour: {stat.lastUpdated}
            </div>
        </div>
    )
}

interface TrackerStatsGridProps {
    stats: TrackerStat[]
    refreshing: boolean
    onRefresh: () => void
}

/** Grid des statistiques de trackers avec ratio, upload/download, bonus, seeding. */
export function TrackerStatsGrid({ stats, refreshing, onRefresh }: TrackerStatsGridProps) {
    return (
        <div className="bg-gray-900/50 rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    Statistiques des Trackers
                </h3>
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {stats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>Aucun tracker configuré</p>
                    <p className="text-sm mt-1">Ajoutez un tracker pour voir vos statistiques</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.map(stat => (
                        <TrackerStatCard key={stat.id} stat={stat} />
                    ))}
                </div>
            )}
        </div>
    )
}
