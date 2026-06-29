'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import type {
  NotificationEvent,
  NotificationsV2Config,
} from '@/lib/notifications-v2'
import { EVENT_MEDIA_TYPES, type UserOption } from '../../_types/notifications-v2'
import EventUserSelector from './EventUserSelector'
import TemplateHelpModal from './TemplateHelpModal'

type EventRouteConfig = NotificationsV2Config['events'][NotificationEvent]

interface EventRouteCardProps {
  event: NotificationEvent
  route: EventRouteConfig
  users: UserOption[]
  mediaType: 'movie' | 'tv'
  onChange: (patch: Partial<EventRouteConfig>) => void
  onTest: () => void
}

export default function EventRouteCard({
  event,
  route,
  users,
  mediaType,
  onChange,
  onTest,
}: EventRouteCardProps) {
  const [testing, setTesting] = useState(false)

  const handleTest = () => {
    setTesting(true)
    onTest()
    setTimeout(() => setTesting(false), 2000)
  }

  const isTvOnly = EVENT_MEDIA_TYPES[event] === 'tv'
  const templateKey: 'templateMovie' | 'templateTv' =
    mediaType === 'tv' ? 'templateTv' : 'templateMovie'
  const templateLabel = mediaType === 'tv' ? 'Template Série' : 'Template Film'
  const templatePlaceholder =
    mediaType === 'tv'
      ? '{title} {year} {season} {user} {overview} {genres} {rating} {quality} {size} {progress} {release} {reason} {stage} {event} {timestamp}'
      : '{title} {year} {user} {overview} {genres} {rating} {quality} {size} {progress} {release} {reason} {stage} {event} {timestamp}'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer text-gray-300">
          <input
            type="checkbox"
            checked={route.includePoster}
            onChange={(e) => onChange({ includePoster: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
          />
          Inclure le poster
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-gray-300">
          <input
            type="checkbox"
            checked={route.notifyRequester}
            onChange={(e) => onChange({ notifyRequester: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
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
        className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

      <div>
        <label className="text-xs text-gray-400 mb-1 block">
          {templateLabel} {isTvOnly && '(série uniquement)'}
          <span className="text-gray-500 ml-1">— laisser vide = défaut</span>
        </label>
        <textarea
          className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm font-mono text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={3}
          placeholder={templatePlaceholder}
          value={route[templateKey] ?? ''}
          onChange={(e) =>
            onChange({
              [templateKey]: e.target.value,
            } as Partial<EventRouteConfig>)
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <TemplateHelpModal />
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          title={`Tester avec un ${mediaType === 'tv' ? 'épisode de série' : 'film'}`}
        >
          <Play className={`w-3 h-3 ${testing ? 'animate-pulse' : ''}`} />
          {testing ? 'Envoi...' : 'Tester'}
        </button>
      </div>
    </div>
  )
}
