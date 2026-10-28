'use client'

import { useState, useCallback, useRef } from 'react'
import { useReleaseCalendar } from './release-calendar/_hooks/useReleaseCalendar'
import { CalendarHeader } from './release-calendar/_components/CalendarHeader'
import { CalendarGrid } from './release-calendar/_components/CalendarGrid'
import { CalendarWeekList } from './release-calendar/_components/CalendarWeekList'
import { EventTooltip } from './release-calendar/_components/EventTooltip'
import type { CalendarEvent } from '@/app/actions/calendar'

export function ReleaseCalendar() {
  const {
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
  } = useReleaseCalendar()

  // Touch state for mobile tooltip
  const [touchedEvent, setTouchedEvent] = useState<CalendarEvent | null>(null)
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null)
  const lastTouchTimeRef = useRef(0)
  const shouldNavigateRef = useRef(false)
  // Souris : l'infobulle survit au court passage d'une sortie à l'autre (elle glisse vers la
  // suivante) et reste affichée après un clic, le temps que son affiche s'envole vers la fiche
  const leaveTimerRef = useRef<number | undefined>(undefined)
  const pinnedUntilRef = useRef(0)

  const handleTouchStart = useCallback((event: CalendarEvent, x: number, y: number) => {
    lastTouchTimeRef.current = Date.now()

    setTouchedEvent(prev => {
      if (prev?.id === event.id) {
        // Second tap on the same event -> authorize navigation on next click
        shouldNavigateRef.current = true
        return prev
      } else {
        // First tap -> show tooltip, block navigation
        shouldNavigateRef.current = false
        setTouchPos({ x, y })
        return event
      }
    })
  }, [])

  const handleTouchElsewhere = useCallback(() => {
    setTouchedEvent(null)
    setTouchPos(null)
    shouldNavigateRef.current = false
  }, [])

  const handleSelectEventWithTouchCheck = useCallback((event: CalendarEvent) => {
    const isTouch = Date.now() - lastTouchTimeRef.current < 1000
    if (isTouch) {
      if (shouldNavigateRef.current) {
        handleSelectEvent(event)
        setTouchedEvent(null)
        setTouchPos(null)
        shouldNavigateRef.current = false
      } else {
        // First tap: just open tooltip, don't navigate
      }
    } else {
      // Desktop / Mouse: navigate immediately
      pinnedUntilRef.current = Date.now() + 4000
      window.clearTimeout(leaveTimerRef.current)
      handleSelectEvent(event)
    }
  }, [handleSelectEvent])

  // Determine which tooltip to show (hover on desktop, touch on mobile)
  const activeEvent = touchedEvent || hoveredEvent
  const activePos = touchPos || mousePos
  const isTouchTooltip = !!touchedEvent

  return (
    <div
      className="flex flex-col h-full md:min-h-[850px] relative"
      onClick={touchedEvent ? handleTouchElsewhere : undefined}
    >
      <CalendarHeader
        date={date}
        isLoading={isLoading}
        showMovies={showMovies}
        showSeries={showSeries}
        onNavigate={handleNavigate}
        onToggleMovies={() => setShowMovies(prev => !prev)}
        onToggleSeries={() => setShowSeries(prev => !prev)}
      />

      <CalendarWeekList weekDays={weekDays} getDayEvents={getDayEvents} onSelectEvent={handleSelectEvent} />

      <CalendarGrid
        date={date}
        calendarDays={calendarDays}
        getDayEvents={getDayEvents}
        onSelectEvent={handleSelectEventWithTouchCheck}
        onEventMouseEnter={(event, x, y) => {
          if (Date.now() - lastTouchTimeRef.current < 1000 || Date.now() < pinnedUntilRef.current) return
          window.clearTimeout(leaveTimerRef.current)
          setMousePos({ x, y })
          setHoveredEvent(event)
        }}
        onEventMouseMove={(x, y) => {
          if (Date.now() - lastTouchTimeRef.current < 1000 || Date.now() < pinnedUntilRef.current) return
          setMousePos({ x, y })
        }}
        onEventMouseLeave={() => {
          if (Date.now() - lastTouchTimeRef.current < 1000 || Date.now() < pinnedUntilRef.current) return
          window.clearTimeout(leaveTimerRef.current)
          leaveTimerRef.current = window.setTimeout(() => {
            setHoveredEvent(null)
            setMousePos(null)
          }, 90)
        }}
        onEventTouchStart={handleTouchStart}
      />

      {activeEvent && activePos && (
        <EventTooltip
          event={activeEvent}
          mousePos={activePos}
          isTouch={isTouchTooltip}
        />
      )}
    </div>
  )
}
