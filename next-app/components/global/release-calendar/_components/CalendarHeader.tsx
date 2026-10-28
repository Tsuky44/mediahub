'use client'

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarHeaderProps {
  date: Date
  isLoading: boolean
  showMovies: boolean
  showSeries: boolean
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onToggleMovies: () => void
  onToggleSeries: () => void
}

export function CalendarHeader({
  date,
  isLoading,
  showMovies,
  showSeries,
  onNavigate,
  onToggleMovies,
  onToggleSeries,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3 px-1 relative z-10">
      {/* Titre et mois sur une ligne */}
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="onyx-title text-2xl font-bold text-white tracking-tight">Calendrier</h2>
        <span className="capitalize text-sm font-medium text-gray-400">{format(date, 'MMMM yyyy', { locale: fr })}</span>
        {isLoading && <Loader2 className="w-4 h-4 self-center animate-spin text-indigo-400" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('PREV')}
            aria-label="Mois précédent"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('TODAY')}
            className="h-7 px-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('NEXT')}
            aria-label="Mois suivant"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1.5 text-xs font-medium">
          <button
            onClick={onToggleMovies}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer select-none',
              showMovies
                ? 'bg-amber-500/10 text-amber-200/90 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-400'
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                showMovies ? 'bg-amber-500 animate-pulse' : 'bg-gray-600'
              )}
            />
            <span>Films</span>
          </button>
          <button
            onClick={onToggleSeries}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer select-none',
              showSeries
                ? 'bg-indigo-500/10 text-indigo-200/90 border-indigo-500/20 hover:bg-indigo-500/20'
                : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-400'
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                showSeries ? 'bg-indigo-500 animate-pulse' : 'bg-gray-600'
              )}
            />
            <span>Séries</span>
          </button>
        </div>
      </div>
    </div>
  )
}
