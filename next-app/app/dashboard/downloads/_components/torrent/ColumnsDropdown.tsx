'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { LayoutTemplate, CheckCircle } from 'lucide-react'
import { COLUMN_OPTIONS } from '../../_constants/torrent-options'
import type { VisibleColumns } from './TorrentRow'

interface ColumnsDropdownProps {
  visibleColumns: VisibleColumns
  onToggleColumn: (id: string) => void
}

export function ColumnsDropdown({ visibleColumns, onToggleColumn }: ColumnsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative flex-1 md:flex-none z-30">
      <button
        onClick={() => setIsOpen(v => !v)}
        className={clsx(
          'w-full md:w-auto flex items-center justify-center gap-2 px-3 h-11 bg-white/5 backdrop-blur-md border rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap',
          isOpen
            ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
        )}
        title="Choisir les colonnes"
      >
        <LayoutTemplate className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 md:left-0 mt-2 w-56 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
              Affichage
            </div>
            {COLUMN_OPTIONS.map(col => (
              <button
                key={col.id}
                onClick={() => onToggleColumn(col.id)}
                className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-3 hover:bg-white/5 text-gray-300 hover:text-white"
              >
                <div
                  className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all',
                    visibleColumns[col.id]
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/20'
                  )}
                >
                  {visibleColumns[col.id] && <CheckCircle className="w-3 h-3 fill-current" />}
                </div>
                {col.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
