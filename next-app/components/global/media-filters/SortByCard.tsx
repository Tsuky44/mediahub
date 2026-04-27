'use client'

import { SortDesc } from 'lucide-react'
import clsx from 'clsx'
import { SORT_OPTIONS } from './_constants/media-filters-options'

interface SortByCardProps {
  value: string
  onChange: (value: string) => void
}

export function SortByCard({ value, onChange }: SortByCardProps) {
  return (
    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 text-indigo-400">
        <SortDesc className="h-4 w-4" />
        <h4 className="font-bold text-white">Trier par</h4>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'text-left px-4 py-2.5 rounded-2xl text-sm transition-all border',
              value === opt.value
                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-semibold shadow-sm'
                : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
