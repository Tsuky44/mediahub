'use client'

import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface MediaTypeTabsProps {
  activeType: string
  isPending: boolean
  onChange: (type: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations') => void
  showTabs?: boolean
}

const TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'movie', label: 'Films' },
  { id: 'tv', label: 'Séries' },
  { id: 'recommendations', label: 'Recommandés' },
  { id: 'watch-later', label: 'À regarder plus tard' },
]

export function MediaTypeTabs({ activeType, isPending, onChange, showTabs = true }: MediaTypeTabsProps) {
  if (!showTabs) return null

  return (
    <div className="w-full border-b border-gray-800/50 pb-4">
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex p-1 gap-1.5 bg-gray-900/40 rounded-2xl border border-gray-800/50 relative whitespace-nowrap">
          {isPending && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            </div>
          )}
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id as any)}
              disabled={isPending}
              className={clsx(
                'px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
                activeType === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40',
                isPending && activeType === tab.id && 'animate-pulse'
              )}
            >
              {tab.label}
              {activeType === tab.id && <div className="absolute inset-0 bg-white/10 rounded-xl animate-pulse" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
