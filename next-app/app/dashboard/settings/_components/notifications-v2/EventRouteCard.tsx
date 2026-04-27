'use client'

import type {
  NotificationEvent,
  NotificationsV2Config,
} from '@/lib/notifications-v2'
import { EVENT_LABELS, type UserOption } from '../../_types/notifications-v2'
import EventUserSelector from './EventUserSelector'

type EventRouteConfig = NotificationsV2Config['events'][NotificationEvent]

interface EventRouteCardProps {
  event: NotificationEvent
  route: EventRouteConfig
  users: UserOption[]
  onChange: (patch: Partial<EventRouteConfig>) => void
}

export default function EventRouteCard({
  event,
  route,
  users,
  onChange,
}: EventRouteCardProps) {
  return (
    <div className="border rounded p-3 dark:border-gray-700 space-y-2">
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={route.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span className="font-medium">{EVENT_LABELS[event]}</span>
          <code className="text-xs text-gray-500">{event}</code>
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={route.notifyRequester}
            onChange={(e) => onChange({ notifyRequester: e.target.checked })}
          />
          Notifier le demandeur
        </label>
      </div>
      <EventUserSelector
        users={users}
        targetUserIds={route.targetUserIds ?? []}
        onChange={(targetUserIds) => onChange({ targetUserIds })}
      />
      <input
        className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800"
        placeholder="Numéros bruts additionnels, séparés par virgules (ex: 33611112222, 33633334444)"
        value={route.targetNumbers.join(', ')}
        onChange={(e) =>
          onChange({
            targetNumbers: e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
      />
      <textarea
        className="w-full border rounded px-3 py-2 text-sm font-mono dark:bg-gray-800"
        rows={4}
        placeholder="Template personnalisé (placeholders: {title} {year} {user} {overview} {genres} {rating} {quality} {size} {reason}). Laisser vide = template par défaut."
        value={route.template ?? ''}
        onChange={(e) => onChange({ template: e.target.value })}
      />
    </div>
  )
}
