'use client'

import { Award, Clock, RefreshCw } from 'lucide-react'
import type { TrackerStatsCacheInfo } from '../../_types/tracker-stat'
import { formatAge } from '../../_utils/tracker-card-formatters'

interface TrackerGlobalRatioCardProps {
  globalRatio: number
  cacheInfo: TrackerStatsCacheInfo
  refreshing: boolean
  onRefresh: () => void
}

export default function TrackerGlobalRatioCard({
  globalRatio,
  cacheInfo,
  refreshing,
  onRefresh,
}: TrackerGlobalRatioCardProps) {
  const ratioColor =
    globalRatio >= 1
      ? 'text-emerald-400'
      : globalRatio >= 0.5
      ? 'text-yellow-400'
      : 'text-red-400'

  return (
    <div className="md:col-span-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-2 mb-2">
        <Award className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Ratio Global
        </span>
      </div>
      <div className="flex items-end justify-between">
        <p className={`text-lg font-black font-mono ${ratioColor}`}>
          {globalRatio.toFixed(2)}
        </p>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Forcer le rafraîchissement"
          className="p-1.5 text-gray-500 hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
      {cacheInfo.cached && cacheInfo.age !== undefined && (
        <p className="text-[9px] text-gray-600 flex items-center gap-1 mt-1">
          <Clock className="w-2.5 h-2.5" />
          {formatAge(cacheInfo.age)}
        </p>
      )}
    </div>
  )
}
