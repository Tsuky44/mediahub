'use client'

import { LayoutGrid } from 'lucide-react'
import { CountUp } from '@/components/ui/count-up'
import type { DashboardStats } from '../../_types/dashboard'
import { DASHBOARD_CARD, DASHBOARD_EYEBROW } from './card-styles'

interface LibraryStatsCardProps {
  stats: DashboardStats | null
}

export function LibraryStatsCard({ stats }: LibraryStatsCardProps) {
  const library = stats?.library
  const items = [
    { label: 'Films', value: library?.movies },
    { label: 'Séries', value: library?.series },
    { label: 'Épisodes', value: library?.episodes },
  ]
  return (
    <div className={DASHBOARD_CARD}>
      <div className="flex items-center justify-between mb-2">
        <span className={DASHBOARD_EYEBROW}>Médiathèque</span>
        <LayoutGrid className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-800/70">
        {items.map(({ label, value }) => (
          <div key={label} className="px-3 first:pl-0 last:pr-0 min-w-0">
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{label}</div>
            <div className="text-xl font-bold text-white leading-tight tabular-nums">
              <CountUp value={value ? String(value) : '--'} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
