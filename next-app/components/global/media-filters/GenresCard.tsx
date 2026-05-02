'use client'

import { Check, Filter } from 'lucide-react'
import clsx from 'clsx'
import type { Genre } from './_types/media-filters'

interface GenresCardProps {
  genres: Genre[]
  selected: number[]
  onToggle: (id: number) => void
}

export function GenresCard({ genres, selected = [], onToggle }: GenresCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-indigo-400">
          <Filter className="h-4 w-4" />
          <h4 className="font-bold text-white">Genres</h4>
        </div>
        <span className="text-[10px] bg-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-400 font-bold border border-indigo-500/30">
          {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 bg-gray-800/20 p-4 rounded-3xl border border-gray-800/50 max-h-[500px] overflow-y-auto custom-scrollbar">
        {genres.map((genre) => {
          const isSelected = selected.includes(genre.id)
          return (
            <button
              key={genre.id}
              onClick={() => onToggle(genre.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border group',
                isSelected
                  ? 'bg-indigo-500 border-indigo-400 text-white font-semibold shadow-md shadow-indigo-500/20'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-500 hover:text-gray-200 hover:bg-gray-700/50'
              )}
            >
              <span>{genre.name}</span>
              {isSelected && <Check className="h-3 w-3 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
