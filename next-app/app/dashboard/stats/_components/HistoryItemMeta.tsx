'use client'

import { Activity, User, Monitor } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatDuration, type ProcessedHistoryItem } from '../_utils/history-formatters'

interface HistoryItemMetaProps {
  item: ProcessedHistoryItem
}

export function HistoryItemMeta({ item }: HistoryItemMetaProps) {
  const { duration, isLive, date, userName, UserName, Client, client, DeviceName, device } = item

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
        <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
          <User className="h-3 w-3 text-indigo-400" />
          <span className="font-medium text-gray-300 truncate max-w-[100px]">{userName || UserName}</span>
        </div>

        {(Client || client || DeviceName || device) && (
          <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
            <Monitor className="h-3 w-3 text-blue-400" />
            <span
              className="font-medium text-gray-300 truncate max-w-[150px]"
              title={`${Client || client || ''} ${DeviceName || device ? `(${DeviceName || device})` : ''}`}
            >
              {(() => {
                const c = Client || client
                const d = DeviceName || device
                if (c && d && c !== d && !c.includes(d)) return `${c} (${d})`
                return c || d
              })()}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span className="font-medium tabular-nums text-gray-400 group-hover:text-gray-300 transition-colors">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-300 ${
          isLive
            ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20'
            : 'text-gray-500 bg-gray-900/50 border-white/5 group-hover:text-indigo-300 group-hover:border-indigo-500/30'
        }`}>
          {isLive ? 'En cours' : formatDistanceToNow(date, { addSuffix: true, locale: fr })}
        </span>
      </div>
    </>
  )
}
