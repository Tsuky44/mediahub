'use client'

import { LayoutGrid } from 'lucide-react'
import type { DashboardStats } from '../../_types/dashboard'

interface LibraryStatsCardProps {
  stats: DashboardStats | null
}

export function LibraryStatsCard({ stats }: LibraryStatsCardProps) {
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Médiathèque
        </span>
        <LayoutGrid className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/30 p-2 rounded-xl border border-gray-800/50">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
            Films
          </div>
          <div className="text-lg font-bold text-white leading-none">
            {stats?.library?.movies || '--'}
          </div>
        </div>
        <div className="bg-gray-800/30 p-2 rounded-xl border border-gray-800/50">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
            Séries
          </div>
          <div className="text-lg font-bold text-white leading-none">
            {stats?.library?.series || '--'}
          </div>
        </div>
      </div>
      {stats?.library?.episodes !== undefined && stats.library.episodes > 0 && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-gray-500 font-medium">
            Total de {stats.library.episodes} épisodes
          </span>
        </div>
      )}
    </div>
  )
}
