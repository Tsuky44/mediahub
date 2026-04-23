'use client'

import { useState } from 'react'
import { Search, User, Loader2 } from 'lucide-react'
import { ProwlarrSearch } from '@/components/global/ProwlarrSearch'
import { triggerAutomaticSearch } from '@/app/dashboard/media/[id]/interactive-actions'

interface SearchActionsProps {
  title: string
  canManage?: boolean // Deprecated, use specific flags below
  canTriggerSearch?: boolean
  canInteractiveSearch?: boolean
  mediaType?: 'movie' | 'tv'
  tmdbId?: number
  tvdbId?: number
  seasons?: any[]
  initialSeason?: number | null
  initialEpisode?: number | null
  className?: string
}

export function SearchActions({
  title,
  canManage = true,
  canTriggerSearch,
  canInteractiveSearch,
  mediaType = 'movie',
  tmdbId,
  tvdbId,
  seasons,
  initialSeason = null,
  initialEpisode = null,
  className
}: SearchActionsProps) {
  // Backwards compatibility defaults
  const allowTrigger = canTriggerSearch ?? canManage
  const allowInteractive = canInteractiveSearch ?? canManage

  const [isInteractiveOpen, setIsInteractiveOpen] = useState(false)
  const [autoSearching, setAutoSearching] = useState(false)

  const handleAutoSearch = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (autoSearching || !tmdbId) return

    if (!confirm('Lancer la recherche automatique ?')) return

    setAutoSearching(true)
    const res = await triggerAutomaticSearch(mediaType, tmdbId, tvdbId, initialSeason ?? undefined, initialEpisode ?? undefined)
    
    if (res.error) {
        alert('Erreur: ' + res.error)
    } else {
        alert(res.message)
    }
    setAutoSearching(false)
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
        {allowTrigger && (
            <button
                onClick={handleAutoSearch}
                className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Recherche automatique"
                disabled={autoSearching}
            >
                {autoSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
        )}
        
        {allowInteractive && (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsInteractiveOpen(true)
                }}
                className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Recherche interactive"
            >
                <User className="w-4 h-4" />
            </button>
        )}

      {isInteractiveOpen && allowInteractive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                Recherche Interactive: {title} {initialSeason !== null && ` - Saison ${initialSeason}`} {initialEpisode !== null && ` Episode ${initialEpisode}`}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsInteractiveOpen(false)
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
                canManage={allowInteractive}
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
    </div>
  )
}
