'use client'

import clsx from 'clsx'
import { STATUS_FILTERS } from '../../_constants/torrent-options'

interface StatusFilterRowProps {
  filter: string
  onFilterChange: (id: string) => void
}

export function StatusFilterRow({ filter, onFilterChange }: StatusFilterRowProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur-md shadow-inner w-max min-w-full sm:min-w-0 sm:w-auto">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2',
              filter === f.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <f.icon
              className={clsx(
                'w-3.5 h-3.5',
                filter === f.id ? 'text-white' : 'text-gray-500 group-hover:text-white'
              )}
            />
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
