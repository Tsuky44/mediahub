'use client'

import { ArrowUpDown } from 'lucide-react'
import clsx from 'clsx'

interface SortOption {
  id: string
  label: string
}

interface SortSectionProps {
  options: SortOption[]
  sortBy: string
  onChange: (id: string) => void
}

export function SortSection({ options, sortBy, onChange }: SortSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
        <ArrowUpDown className="h-4 w-4 text-indigo-400" />
        Trier par
      </div>
      <div className="bg-black/20 border border-white/5 rounded-2xl p-2 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={clsx(
              'w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all mb-1',
              sortBy === option.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
