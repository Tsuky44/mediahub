'use client'

import { ExternalLink, Globe } from 'lucide-react'
import type { TrackerStat } from '../../_types/tracker-stat'

interface TrackerStatButtonProps {
  stat: TrackerStat
  onSelect: (stat: TrackerStat) => void
}

export default function TrackerStatButton({
  stat,
  onSelect,
}: TrackerStatButtonProps) {
  return (
    <button
      onClick={() => onSelect(stat)}
      className="md:col-span-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all group text-left relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
          Tracker
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{stat.name}</p>
        </div>
        <p
          className={`text-lg font-black font-mono ${stat.ratioColor} flex-shrink-0 ml-2`}
        >
          {stat.ratio.toFixed(2)}
        </p>
      </div>
    </button>
  )
}
