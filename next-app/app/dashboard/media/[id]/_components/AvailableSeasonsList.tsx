'use client'

import { useState } from 'react'
import { FolderOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface SeasonInfo {
  seasonNumber: number
  status: 'Downloaded' | 'Downloading' | 'Missing' | 'Partial'
  progress?: number
  quality?: string
  size?: string
  language?: string
  dateAdded?: string
  timeleft?: string
  releaseTitle?: string
  isSeasonPack?: boolean
}

interface AvailableSeasonsListProps {
  seasons: SeasonInfo[]
}

export function AvailableSeasonsList({ seasons }: AvailableSeasonsListProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-t border-white/5 pt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition text-xs font-semibold text-gray-300 hover:text-white"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
          <span>Saisons disponibles ({seasons.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {seasons.map(season => (
            <div
              key={season.seasonNumber}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-white w-10 shrink-0">
                  S{season.seasonNumber}
                </span>
                <div className="flex-1 flex items-center gap-2 text-gray-400 min-w-0">
                  <span className="truncate text-gray-300">{season.quality || '-'}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-indigo-300 shrink-0">{season.size}</span>
                </div>
                <StatusBadge status={season.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
