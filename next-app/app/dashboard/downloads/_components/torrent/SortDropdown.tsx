'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { ArrowUpDown } from 'lucide-react'
import { SORT_OPTIONS } from '../../_constants/torrent-options'

interface SortDropdownProps {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortByChange: (id: string) => void
  onSortOrderChange: (value: 'asc' | 'desc') => void
}

export function SortDropdown({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative flex-1 md:flex-none z-30">
      <div className="flex items-center justify-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 h-11 w-full backdrop-blur-md">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition-colors px-2"
        >
          <ArrowUpDown className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold truncate max-w-[80px] md:max-w-none">
            {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
          </span>
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-indigo-400 transition-all"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-52 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => {
                  onSortByChange(option.id)
                  setIsOpen(false)
                }}
                className={clsx(
                  'w-full text-left px-4 py-2.5 text-xs transition-colors',
                  sortBy === option.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
