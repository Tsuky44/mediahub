'use client'

import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import { CalendarEvent } from '@/app/actions/calendar'
import { cn } from '@/lib/utils'

interface CalendarGridProps {
  date: Date
  calendarDays: Date[]
  getDayEvents: (day: Date) => CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
  onEventMouseEnter: (event: CalendarEvent, x: number, y: number) => void
  onEventMouseMove: (x: number, y: number) => void
  onEventMouseLeave: () => void
  onEventTouchStart?: (event: CalendarEvent, x: number, y: number) => void
}

const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function CalendarGrid({
  date,
  calendarDays,
  getDayEvents,
  onSelectEvent,
  onEventMouseEnter,
  onEventMouseMove,
  onEventMouseLeave,
  onEventTouchStart,
}: CalendarGridProps) {
  return (
    <div className="flex-1 bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl relative">
      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
        {daysOfWeek.map(day => (
          <div
            key={day}
            className="py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-widest"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr h-full">
        {calendarDays.map((day, dayIdx) => {
          const dayEvents = getDayEvents(day)
          const isCurrentMonth = isSameMonth(day, date)
          const isTodayDate = isToday(day)

          return (
            <div
              key={day.toString()}
              className={cn(
                'min-h-[140px] p-2 border-b border-r border-white/5 relative group transition-colors hover:bg-white/[0.02]',
                !isCurrentMonth && 'bg-black/20 text-gray-600',
                dayIdx % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    isTodayDate
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                      : isCurrentMonth
                        ? 'text-gray-400 group-hover:text-gray-200'
                        : 'text-gray-700'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={e => {
                      e.stopPropagation()
                      onSelectEvent(event)
                    }}
                    onMouseEnter={e => {
                      onEventMouseEnter(event, e.clientX, e.clientY)
                    }}
                    onMouseLeave={onEventMouseLeave}
                    onMouseMove={e => {
                      onEventMouseMove(e.clientX, e.clientY)
                    }}
                    onTouchStart={e => {
                      const touch = e.touches[0]
                      onEventTouchStart?.(event, touch.clientX, touch.clientY)
                    }}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] font-medium truncate cursor-pointer transition-all border-l-2 touch-manipulation',
                      event.mediaType === 'movie'
                        ? 'bg-amber-500/10 text-amber-200/90 border-amber-500/50 hover:bg-amber-500/20 active:bg-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-200/90 border-indigo-500/50 hover:bg-indigo-500/20 active:bg-indigo-500/30',
                      event.status === 'unmonitored' && 'opacity-50 grayscale'
                    )}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
