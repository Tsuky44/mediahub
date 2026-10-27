'use client'

import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import type { Torrent } from '@/lib/services/qbittorrent'
import { formatDashboardSpeed } from '../../_utils/dashboard-torrent-stats'
import { DASHBOARD_CARD, DASHBOARD_EYEBROW } from './card-styles'

interface TransfersCardProps {
  activeTorrents: Torrent[]
  totalDlSpeed: number
  totalUlSpeed: number
}

export function TransfersCard({
  activeTorrents,
  totalDlSpeed,
  totalUlSpeed,
}: TransfersCardProps) {
  const torrent = activeTorrents[0]
  const others = activeTorrents.length - 1
  return (
    <div className={DASHBOARD_CARD}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={DASHBOARD_EYEBROW}>Transferts</span>
        <span className="flex items-center gap-3 text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1 text-blue-400" title="Download">
            <ArrowDown className="w-3 h-3" aria-label="Download" />
            {formatDashboardSpeed(totalDlSpeed)}
          </span>
          <span className="flex items-center gap-1 text-green-400" title="Upload">
            <ArrowUp className="w-3 h-3" aria-label="Upload" />
            {formatDashboardSpeed(totalUlSpeed)}
          </span>
        </span>
      </div>

      {torrent ? (
        <div className="space-y-1">
          <div className="flex justify-between gap-3 text-[11px] text-gray-400">
            <span className="truncate" title={torrent.name}>{torrent.name}</span>
            <span className="tabular-nums text-gray-300">{Math.round(torrent.progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
            <div
              className={`${
                torrent.dlspeed > 0 ? 'bg-blue-500' : 'bg-green-500'
              } h-full transition-all duration-500 ${torrent.dlspeed > 0 ? 'onyx-sheen' : ''}`}
              style={{ width: `${torrent.progress * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-600 py-1">Aucun transfert actif</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-gray-500">
          {others > 0 ? `+${others} autre${others > 1 ? 's' : ''} transfert${others > 1 ? 's' : ''}` : ''}
        </span>
        <Link
          href="/dashboard/downloads"
          className="group shrink-0 text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
        >
          Voir les téléchargements <ArrowRight className="onyx-nudge w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
