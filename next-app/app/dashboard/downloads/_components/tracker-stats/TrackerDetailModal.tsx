'use client'

import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  Coins,
  ExternalLink,
  Globe,
  X,
} from 'lucide-react'
import type { TrackerStat } from '../../_types/tracker-stat'
import { formatStatsSize } from '../../_utils/stats-formatters'
import {
  formatBonus,
  getBonusLabel,
} from '../../_utils/tracker-card-formatters'

interface TrackerDetailModalProps {
  stat: TrackerStat
  onClose: () => void
}

export default function TrackerDetailModal({
  stat,
  onClose,
}: TrackerDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate">{stat.name}</h3>
              {stat.baseUrl && (
                <a
                  href={stat.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ouvrir le tracker
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
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
            {(stat.seedingCount !== undefined ||
              stat.leechingCount !== undefined) && (
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
                  {stat.leechingCount !== undefined &&
                    stat.leechingCount > 0 && (
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

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  )
}
