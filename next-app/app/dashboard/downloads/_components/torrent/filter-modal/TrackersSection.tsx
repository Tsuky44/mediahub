'use client'

import { Signal, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface TrackersSectionProps {
  trackers: string[]
  selected: string[]
  onToggle: (tracker: string) => void
}

export function TrackersSection({ trackers, selected, onToggle }: TrackersSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
          <Signal className="h-4 w-4 text-indigo-400" />
          Trackers
        </div>
        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
          {selected.length} sélectionné
        </span>
      </div>
      <div className="bg-black/20 border border-white/5 rounded-2xl p-4 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="grid grid-cols-1 gap-2">
          {trackers.map(tracker => (
            <button
              key={tracker}
              onClick={() => onToggle(tracker)}
              className={clsx(
                'flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border',
                selected.includes(tracker)
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5'
                  : 'bg-transparent text-gray-400 border-white/5 hover:border-white/10 hover:bg-white/5 hover:text-white'
              )}
            >
              <span className="truncate">{tracker}</span>
              <div
                className={clsx(
                  'w-4 h-4 rounded-full border flex items-center justify-center transition-all',
                  selected.includes(tracker) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                )}
              >
                {selected.includes(tracker) && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
            </button>
          ))}
          {trackers.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-xs italic flex flex-col items-center gap-2">
              <Signal className="w-8 h-8 opacity-20" />
              Aucun tracker disponible
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
