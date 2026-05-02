'use client'

import { useReleaseCalendar } from './release-calendar/_hooks/useReleaseCalendar'
import { CalendarHeader } from './release-calendar/_components/CalendarHeader'
import { CalendarGrid } from './release-calendar/_components/CalendarGrid'
import { EventTooltip } from './release-calendar/_components/EventTooltip'

export function ReleaseCalendar() {
  const {
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
  } = useReleaseCalendar()

  return (
    <div className="flex flex-col h-full min-h-[850px] relative">
      <CalendarHeader
        date={date}
        isLoading={isLoading}
        showMovies={showMovies}
        showSeries={showSeries}
        onNavigate={handleNavigate}
        onToggleMovies={() => setShowMovies(prev => !prev)}
        onToggleSeries={() => setShowSeries(prev => !prev)}
      />

      <CalendarGrid
        date={date}
        calendarDays={calendarDays}
        getDayEvents={getDayEvents}
        onSelectEvent={handleSelectEvent}
        onEventMouseEnter={(event, x, y) => {
          setMousePos({ x, y })
          setHoveredEvent(event)
        }}
        onEventMouseMove={(x, y) => setMousePos({ x, y })}
        onEventMouseLeave={() => {
          setHoveredEvent(null)
          setMousePos(null)
        }}
      />

      {hoveredEvent && mousePos && (
        <EventTooltip event={hoveredEvent} mousePos={mousePos} />
      )}
    </div>
  )
}
