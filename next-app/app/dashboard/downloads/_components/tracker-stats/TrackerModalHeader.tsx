'use client'

import { ExternalLink, Globe, X } from 'lucide-react'
import type { TrackerStat } from '../../_types/tracker-stat'

interface TrackerModalHeaderProps {
  stat: TrackerStat
  onClose: () => void
}

export function TrackerModalHeader({ stat, onClose }: TrackerModalHeaderProps) {
  return (
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
  )
}
