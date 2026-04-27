'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useTrackerStatsCard } from '../_hooks/useTrackerStatsCard'
import type { TrackerStat } from '../_types/tracker-stat'
import TrackerDetailModal from './tracker-stats/TrackerDetailModal'
import TrackerGlobalRatioCard from './tracker-stats/TrackerGlobalRatioCard'
import TrackerStatButton from './tracker-stats/TrackerStatButton'

export function TrackerStatsCard() {
  const { stats, cacheInfo, loading, refreshing, loadStats } =
    useTrackerStatsCard()
  const [selectedTracker, setSelectedTracker] = useState<TrackerStat | null>(
    null
  )

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center justify-center h-20">
          <RefreshCw className="w-5 h-5 text-indigo-400/50 animate-spin" />
        </div>
      </div>
    )
  }

  if (stats.length === 0) {
    return null
  }

  const enabledStats = stats.filter((s) => s.enabled)
  const totalUpload = enabledStats.reduce(
    (acc, s) => acc + (s.uploadedBytes || 0),
    0
  )
  const totalDownload = enabledStats.reduce(
    (acc, s) => acc + (s.downloadedBytes || 0),
    0
  )
  const globalRatio =
    totalDownload > 0
      ? totalUpload / totalDownload
      : totalUpload > 0
      ? 999
      : 0

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <TrackerGlobalRatioCard
          globalRatio={globalRatio}
          cacheInfo={cacheInfo}
          refreshing={refreshing}
          onRefresh={() => loadStats(true)}
        />
        {enabledStats.map((stat) => (
          <TrackerStatButton
            key={stat.id}
            stat={stat}
            onSelect={setSelectedTracker}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedTracker && (
          <TrackerDetailModal
            stat={selectedTracker}
            onClose={() => setSelectedTracker(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
