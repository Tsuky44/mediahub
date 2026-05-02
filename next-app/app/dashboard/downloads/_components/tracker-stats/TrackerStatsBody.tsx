'use client'

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  Coins,
} from 'lucide-react'
import type { TrackerStat } from '../../_types/tracker-stat'
import { formatStatsSize } from '../../_utils/stats-formatters'
import { formatBonus, getBonusLabel } from '../../_utils/tracker-card-formatters'

interface TrackerStatsBodyProps {
  stat: TrackerStat
}

export function TrackerStatsBody({ stat }: TrackerStatsBodyProps) {
  return (
    <div className="p-5 space-y-4">
      {/* Ratio big */}
      <div className="bg-black/30 rounded-2xl p-4 text-center">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
          Ratio
        </p>
        <p className={`text-4xl font-black font-mono ${stat.ratioColor}`}>
          {stat.ratio.toFixed(2)}
        </p>
      </div>

      {/* Upload / Download */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/30 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Upload
            </span>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {stat.uploaded}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {formatStatsSize(stat.uploadedBytes)}
          </p>
        </div>
        <div className="bg-black/30 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              Download
            </span>
          </div>
          <p className="text-sm font-bold text-blue-400 font-mono">
            {stat.downloaded}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {formatStatsSize(stat.downloadedBytes)}
          </p>
        </div>
      </div>

      {/* Bonus + Seeding/Leeching */}
      <div className="grid grid-cols-2 gap-3">
        {stat.bonusPoints !== undefined && stat.bonusPoints > 0 && (
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                {getBonusLabel(stat.name)}
              </span>
            </div>
            <p className="text-sm font-bold text-amber-400 font-mono">
              {formatBonus(stat.bonusPoints)}
            </p>
          </div>
        )}
        {(stat.seedingCount !== undefined || stat.leechingCount !== undefined) && (
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                Torrents
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              {stat.seedingCount !== undefined && (
                <span className="font-bold text-emerald-400">
                  ↑ {stat.seedingCount}
                </span>
              )}
              {stat.leechingCount !== undefined && stat.leechingCount > 0 && (
                <span className="font-bold text-blue-400">
                  ↓ {stat.leechingCount}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
        <Clock className="w-3 h-3" />
        Mis à jour: {stat.lastUpdated}
      </div>
    </div>
  )
}
