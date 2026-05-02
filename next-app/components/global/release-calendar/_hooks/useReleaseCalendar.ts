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
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { getCalendarEvents, CalendarEvent } from '@/app/actions/calendar'

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

  const handleNavigate = useCallback((action: 'PREV' | 'NEXT' | 'TODAY') => {
    setDate(prev => {
      if (action === 'PREV') return subMonths(prev, 1)
      if (action === 'NEXT') return addMonths(prev, 1)
      return new Date()
    })
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setHoveredEvent(null)
    if (event.tmdbId) {
      let url = `/dashboard/media/${event.tmdbId}?type=${event.mediaType}`
      if (event.mediaType === 'tv' && event.seasonNumber) {
        url += `&season=${event.seasonNumber}`
        if (event.episodeNumber) url += `&episode=${event.episodeNumber}`
      }
      router.push(url)
    }
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
