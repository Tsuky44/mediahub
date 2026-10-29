'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  subMonths,
  addMonths,
  subWeeks,
  addWeeks,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { getCalendarEvents, CalendarEvent } from '@/app/actions/calendar'
import { prepareNavTo } from '@/components/global/MotionDirector'

export function useReleaseCalendar() {
  const [date, setDate] = useState(new Date())
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [showMovies, setShowMovies] = useState(true)
  const [showSeries, setShowSeries] = useState(true)
  const router = useRouter()

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { locale: fr })
  const endDate = endOfWeek(monthEnd, { locale: fr })
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  // Vue téléphone : la semaine qui contient `date` (toujours comprise dans la grille du mois)
  const weekDays = eachDayOfInterval({
    start: startOfWeek(date, { locale: fr }),
    end: endOfWeek(date, { locale: fr }),
  })

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const data = await getCalendarEvents(startDate, endDate)
      return data.map(event => ({
        ...event,
        start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
        end: event.end
          ? (typeof event.end === 'string' ? parseISO(event.end) : event.end)
          : undefined,
      }))
    },
    staleTime: 60_000,
  })

  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY', unit: 'month' | 'week' = 'month') => {
    setDate(prev => {
      if (action === 'TODAY') return new Date()
      if (unit === 'week') return action === 'PREV' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      return action === 'PREV' ? subMonths(prev, 1) : addMonths(prev, 1)
    })
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (!event.tmdbId) {
      setHoveredEvent(null)
      return
    }
    let url = `/dashboard/media/${event.tmdbId}?type=${event.mediaType}`
    if (event.mediaType === 'tv' && event.seasonNumber) {
      url += `&season=${event.seasonNumber}`
      if (event.episodeNumber) url += `&episode=${event.episodeNumber}`
    }
    // Comme depuis une affiche : celle de l'infobulle (ou de la ligne, sur téléphone) se retourne
    // sur l'image de fond de la fiche et s'envole ; le reste de l'infobulle s'efface
    const poster =
      document.querySelector('[data-onyx-tooltip-poster]') ??
      document.querySelector(`[data-onyx-event="${CSS.escape(event.id)}"] img`)
    prepareNavTo(url, poster, event.backdropUrl)
    poster?.closest('[data-onyx-tooltip]')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' })
    router.push(url)
  }, [router])

  const getDayEvents = useCallback(
    (day: Date) =>
      events.filter(event => {
        if (!isSameDay(event.start, day)) return false
        if (event.mediaType === 'movie' && !showMovies) return false
        if (event.mediaType === 'tv' && !showSeries) return false
        return true
      }),
    [events, showMovies, showSeries]
  )

  return {
    date,
    isLoading,
    calendarDays,
    weekDays,
    hoveredEvent,
    mousePos,
    showMovies,
    showSeries,
    setHoveredEvent,
    setMousePos,
    setShowMovies,
    setShowSeries,
    handleNavigate,
    handleSelectEvent,
    getDayEvents,
  }
}
