'use client'

import type { WebhookEvent, Webhook } from '../../_types/webhook'

interface WebhookEventsListProps {
  webhook: Webhook
  eventTypes: WebhookEvent[]
  onToggleEvent: (eventId: string) => void
}

export function WebhookEventsList({
  webhook,
  eventTypes,
  onToggleEvent,
}: WebhookEventsListProps) {
  return (
    <div className="pt-4 border-t border-white/10">
      <label className="block text-sm font-medium text-gray-400 mb-3">
        Événements déclencheurs
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {eventTypes.map(event => (
          <label
            key={event.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <input
              type="checkbox"
              checked={(webhook.events || []).includes(event.id)}
              onChange={() => onToggleEvent(event.id)}
              className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500/50 bg-black/40"
            />
            <span className="text-sm text-gray-300">{event.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
