'use client'

import { Bell } from 'lucide-react'

interface NotificationsHeaderProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function NotificationsHeader({
  enabled,
  onToggle,
}: NotificationsHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-indigo-500/10 p-2.5">
          <Bell className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Notifications WhatsApp</h2>
          <p className="text-sm text-gray-400">
            Système autonome via Evolution API — pas de webhooks Radarr/Sonarr.
          </p>
        </div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="sr-only peer"
        />
        <div className="h-7 w-12 rounded-full bg-gray-700 peer-checked:bg-indigo-600 after:absolute after:top-[3px] after:left-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-[21px]" />
        <span className="ml-2 text-sm font-medium text-gray-300">
          {enabled ? 'Activé' : 'Désactivé'}
        </span>
      </label>
    </div>
  )
}
