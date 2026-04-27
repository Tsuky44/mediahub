'use client'

import { ArrowRight, Download } from 'lucide-react'
import Link from 'next/link'
import type { Torrent } from '@/lib/services/qbittorrent'
import { formatDashboardSpeed } from '../../_utils/dashboard-torrent-stats'

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
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm md:col-span-1 lg:col-span-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Transferts
        </span>
        <Download className="w-4 h-4 text-blue-500" />
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold">
            Download
          </span>
          <span className="text-sm font-bold text-blue-400 leading-none">
            {formatDashboardSpeed(totalDlSpeed)}
          </span>
        </div>
        <div className="flex flex-col border-l border-gray-800 pl-4">
          <span className="text-[10px] text-gray-500 uppercase font-bold">
            Upload
          </span>
          <span className="text-sm font-bold text-green-400 leading-none">
            {formatDashboardSpeed(totalUlSpeed)}
          </span>
        </div>
      </div>

      {activeTorrents.length > 0 ? (
        <div className="space-y-2">
          {activeTorrents.slice(0, 1).map((torrent) => (
            <div key={torrent.hash} className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[120px]">{torrent.name}</span>
                <span>{Math.round(torrent.progress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                <div
                  className={`${
                    torrent.dlspeed > 0 ? 'bg-blue-500' : 'bg-green-500'
                  } h-full transition-all duration-500`}
                  style={{ width: `${torrent.progress * 100}%` }}
                />
              </div>
            </div>
          ))}
          {activeTorrents.length > 1 && (
            <Link
              href="/dashboard/downloads"
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 pt-1"
            >
              +{activeTorrents.length - 1} autres transferts{' '}
              <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-600 text-xs">
          Aucun transfert actif
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-800/50">
        <Link
          href="/dashboard/downloads"
          className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center gap-1"
        >
          Voir les téléchargements <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
