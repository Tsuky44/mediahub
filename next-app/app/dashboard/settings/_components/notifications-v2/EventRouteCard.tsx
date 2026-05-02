'use client'

import { useState } from 'react'
import { Film, Tv, Play } from 'lucide-react'
import type {
  NotificationEvent,
  NotificationsV2Config,
} from '@/lib/notifications-v2'
import { EVENT_LABELS, type UserOption } from '../../_types/notifications-v2'
import EventUserSelector from './EventUserSelector'
import TemplateHelpModal from './TemplateHelpModal'

type EventRouteConfig = NotificationsV2Config['events'][NotificationEvent]

interface EventRouteCardProps {
  event: NotificationEvent
  route: EventRouteConfig
  users: UserOption[]
  onChange: (patch: Partial<EventRouteConfig>) => void
  onTest: (mediaType: 'movie' | 'tv') => void
}

export default function EventRouteCard({
  event,
  route,
  users,
  onChange,
  onTest,
}: EventRouteCardProps) {
  const [testing, setTesting] = useState<'movie' | 'tv' | null>(null)

  const handleTest = (mediaType: 'movie' | 'tv') => {
    setTesting(mediaType)
    onTest(mediaType)
    setTimeout(() => setTesting(null), 2000)
  }
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
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={route.includePoster}
              onChange={(e) => onChange({ includePoster: e.target.checked })}
            />
            Inclure le poster
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={route.notifyRequester}
              onChange={(e) => onChange({ notifyRequester: e.target.checked })}
            />
            Notifier le demandeur
          </label>
        </div>
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
      <div className="flex items-center justify-between">
        <TemplateHelpModal />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTest('movie')}
            disabled={testing !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Tester avec un film (poster Avatar)"
          >
            {testing === 'movie' ? (
              <Play className="w-3 h-3 animate-pulse" />
            ) : (
              <Film className="w-3 h-3" />
            )}
            Film
          </button>
          <button
            type="button"
            onClick={() => handleTest('tv')}
            disabled={testing !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Tester avec une série (pas de saison 1)"
          >
            {testing === 'tv' ? (
              <Play className="w-3 h-3 animate-pulse" />
            ) : (
              <Tv className="w-3 h-3" />
            )}
            Série
          </button>
        </div>
      </div>
      <textarea
        className="w-full border rounded px-3 py-2 text-sm font-mono dark:bg-gray-800"
        rows={4}
        placeholder="Template personnalisé ({title} {year} {user} {overview} {genres} {rating} {quality} {size} {progress} {release} {reason} {stage} {event} {timestamp}). Laisser vide = template par défaut."
        value={route.template ?? ''}
        onChange={(e) => onChange({ template: e.target.value })}
      />
    </div>
  )
}
