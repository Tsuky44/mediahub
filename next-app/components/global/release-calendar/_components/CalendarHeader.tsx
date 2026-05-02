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
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 pt-2 px-2 relative z-10 gap-4 md:gap-0">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-1">Calendrier</h1>
          <p className="text-base text-gray-400 font-medium">
            <span className="capitalize text-white/90">{format(date, 'MMMM yyyy', { locale: fr })}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />}

        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('PREV')}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('TODAY')}
            className="h-8 px-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('NEXT')}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-3 text-sm font-medium">
          <button
            onClick={onToggleMovies}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none',
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
              'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none',
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
