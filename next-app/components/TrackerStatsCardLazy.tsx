'use client'

import dynamic from 'next/dynamic'
import { Database, RefreshCw } from 'lucide-react'

// Skeleton shown while loading
function TrackerStatsCardSkeleton() {
  return (
    <div className="bg-gray-900/50 rounded-xl border border-white/10 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Database className="w-5 h-5 text-indigo-400/50" />
        </div>
        <div className="flex-1">
          <div className="h-5 bg-white/10 rounded w-32 mb-2" />
          <div className="h-4 bg-white/5 rounded w-48" />
        </div>
        <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
      </div>
    </div>
  )
}

// Dynamically import the actual component
const TrackerStatsCardDynamic = dynamic(
  () => import('./TrackerStatsCard').then(mod => mod.TrackerStatsCard),
  {
    ssr: false,
    loading: TrackerStatsCardSkeleton
  }
)

export function TrackerStatsCardLazy() {
  return <TrackerStatsCardDynamic />
}
