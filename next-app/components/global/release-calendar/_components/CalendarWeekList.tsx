'use client'

import { format, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Film, Tv } from 'lucide-react'
import type { CalendarEvent } from '@/app/actions/calendar'
import { cn } from '@/lib/utils'

interface CalendarWeekListProps {
  weekDays: Date[]
  getDayEvents: (day: Date) => CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

/**
 * Calendrier sur téléphone : la semaine en liste, du lundi en haut au dimanche en
 * bas. Titres complets ; un appui ouvre directement la fiche.
 */
export function CalendarWeekList({ weekDays, getDayEvents, onSelectEvent }: CalendarWeekListProps) {
  return (
    <div className="md:hidden onyx-stagger flex flex-col gap-2">
      {weekDays.map(day => {
        const events = getDayEvents(day)
        const today = isToday(day)
        return (
          <section
            key={day.toISOString()}
            className={cn(
              'rounded-2xl border px-3 py-2.5',
              today ? 'border-white/20 bg-white/[0.05]' : 'border-white/5 bg-black/20'
            )}
          >
            <header className="flex items-baseline gap-2">
              <span className="w-9 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {format(day, 'EEE', { locale: fr }).replace('.', '')}
              </span>
              <span className={cn('text-lg font-bold leading-none', today ? 'text-white' : 'text-gray-200')}>
                {format(day, 'd')}
              </span>
              <span className="text-xs text-gray-500">{format(day, 'MMMM', { locale: fr })}</span>
              {today && (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-100">
                  Aujourd&apos;hui
                </span>
              )}
            </header>

            {events.length === 0 ? (
              <p className="mt-1 pl-11 text-xs text-gray-600">Rien de prévu</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {events.map(event => {
                  const isMovie = event.mediaType === 'movie'
                  const Icon = isMovie ? Film : Tv
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        data-onyx-event={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border-l-2 px-2.5 py-2 text-left transition-colors',
                          isMovie
                            ? 'border-amber-500/60 bg-amber-500/10 active:bg-amber-500/20'
                            : 'border-indigo-500/60 bg-indigo-500/10 active:bg-indigo-500/20',
                          event.status === 'unmonitored' && 'opacity-50 grayscale'
                        )}
                      >
                        {event.posterUrl ? (
                          <img
                            src={event.posterUrl.replace('/t/p/w500/', '/t/p/w92/')}
                            alt=""
                            loading="lazy"
                            className="h-12 w-8 shrink-0 rounded-md object-cover bg-gray-800"
                          />
                        ) : (
                          <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-gray-500">
                            <Icon className="h-4 w-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-100">{event.title}</span>
                          <span className={cn('text-[11px]', isMovie ? 'text-amber-300/80' : 'text-indigo-200/80')}>
                            {isMovie ? 'Film' : 'Série'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
