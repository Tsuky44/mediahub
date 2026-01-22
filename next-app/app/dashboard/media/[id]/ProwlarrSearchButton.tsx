'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { ProwlarrSearch } from '@/components/ProwlarrSearch'

interface ProwlarrSearchButtonProps {
  title: string
  canManage?: boolean
  mediaType?: 'movie' | 'tv'
  tmdbId?: number
  tvdbId?: number
  seasons?: any[]
  initialSeason?: number | null
  initialEpisode?: number | null
  variant?: 'icon' | 'button' | 'text'
  className?: string
}

export function ProwlarrSearchButton({ 
  title, 
  canManage = true, 
  mediaType, 
  tmdbId, 
  tvdbId, 
  seasons, 
  initialSeason = null, 
  initialEpisode = null,
  variant = 'icon',
  className
}: ProwlarrSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const buttonContent = () => {
    if (variant === 'text') {
      return (
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3" />
          <span>Recherche interactive</span>
        </div>
      )
    }
    if (variant === 'button') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 rounded-lg text-indigo-400 text-sm font-medium transition-all">
          <Search className="w-4 h-4" />
          <span>Recherche interactive</span>
        </div>
      )
    }
    return <Search className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
  }

  return (
    <>
      <button 
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className={className || "p-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition text-indigo-400 group"}
        title="Recherche interactive"
      >
        {buttonContent()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Recherche Interactive: {title} {initialSeason !== null && ` - Saison ${initialSeason}`} {initialEpisode !== null && ` Episode ${initialEpisode}`}
              </h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(false)
                }}
                className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ProwlarrSearch 
                title={title} 
                canManage={canManage}
                mediaType={mediaType}
                tmdbId={tmdbId}
                tvdbId={tvdbId}
                seasons={seasons}
                initialSeason={initialSeason}
                initialEpisode={initialEpisode}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
