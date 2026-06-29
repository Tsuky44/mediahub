'use client'

import { useState } from 'react'
import { ChevronDown, Bell, BellOff } from 'lucide-react'
import type { NotificationEvent } from '@/lib/notifications-v2'
import { EVENT_LABELS } from '../../_types/notifications-v2'

interface EventAccordionItemProps {
  event: NotificationEvent
  enabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  children: React.ReactNode
}

export default function EventAccordionItem({
  event,
  enabled,
  onToggleEnabled,
  children,
}: EventAccordionItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden transition-colors">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <label
            className="inline-flex items-center gap-2 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <span className="font-medium text-sm text-gray-200">{EVENT_LABELS[event]}</span>
            <code className="text-[10px] text-gray-500">{event}</code>
          </label>
          {enabled ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
              <Bell className="w-3 h-3" />
              Actif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-white/5">
              <BellOff className="w-3 h-3" />
              Inactif
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Body */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
