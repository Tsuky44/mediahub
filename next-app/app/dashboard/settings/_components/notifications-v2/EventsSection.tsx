'use client'

import { useState } from 'react'
import { Film, Tv } from 'lucide-react'
import type {
  NotificationEvent,
  NotificationsV2Config,
} from '@/lib/notifications-v2'
import {
  ACTIVE_EVENT_ORDER,
  EVENT_MEDIA_TYPES,
  type UserOption,
} from '../../_types/notifications-v2'
import EventAccordionItem from './EventAccordionItem'
import EventRouteCard from './EventRouteCard'

type EventRouteConfig = NotificationsV2Config['events'][NotificationEvent]

interface EventsSectionProps {
  events: NotificationsV2Config['events']
  users: UserOption[]
  onEventChange: (
    event: NotificationEvent,
    patch: Partial<EventRouteConfig>
  ) => void
  onTestEvent: (event: NotificationEvent, mediaType: 'movie' | 'tv') => void
}

export default function EventsSection({
  events,
  users,
  onEventChange,
  onTestEvent,
}: EventsSectionProps) {
  const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie')

  const visibleEvents = ACTIVE_EVENT_ORDER.filter((ev) => {
    const mt = EVENT_MEDIA_TYPES[ev]
    return mt === 'both' || mt === activeTab
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Événements</h3>

        {/* Onglets Film / Série */}
        <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('movie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'movie'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            Films
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === 'tv'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            Séries
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {visibleEvents.map((ev) => (
          <EventAccordionItem
            key={ev}
            event={ev}
            enabled={events[ev].enabled}
            onToggleEnabled={(enabled) =>
              onEventChange(ev, { enabled })
            }
          >
            <EventRouteCard
              event={ev}
              route={events[ev]}
              users={users}
              mediaType={activeTab}
              onChange={(patch) => onEventChange(ev, patch)}
              onTest={() => onTestEvent(ev, activeTab)}
            />
          </EventAccordionItem>
        ))}
      </div>
    </section>
  )
}
