'use client'

import type {
  NotificationEvent,
  NotificationsV2Config,
} from '@/lib/notifications-v2'
import { EVENT_ORDER, type UserOption } from '../../_types/notifications-v2'
import EventRouteCard from './EventRouteCard'

type EventRouteConfig = NotificationsV2Config['events'][NotificationEvent]

interface EventsSectionProps {
  events: NotificationsV2Config['events']
  users: UserOption[]
  onEventChange: (
    event: NotificationEvent,
    patch: Partial<EventRouteConfig>
  ) => void
}

export default function EventsSection({
  events,
  users,
  onEventChange,
}: EventsSectionProps) {
  return (
    <section>
      <h3 className="font-semibold mb-2">Événements</h3>
      <div className="space-y-4">
        {EVENT_ORDER.map((ev) => (
          <EventRouteCard
            key={ev}
            event={ev}
            route={events[ev]}
            users={users}
            onChange={(patch) => onEventChange(ev, patch)}
          />
        ))}
      </div>
    </section>
  )
}
