'use client'

import { useState } from 'react'
import { useAbility } from '@casl/react'
import { Activity, HardDrive } from 'lucide-react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import { MediaManagerModal } from '@/components/global/MediaManagerModal'
import { CountUp } from '@/components/ui/count-up'
import { DASHBOARD_CARD, DASHBOARD_EYEBROW } from './card-styles'
import type {
  DashboardStats,
  ServicesHealth,
} from '../../_types/dashboard'

interface ServerStatusCardProps {
  servicesStatus: ServicesHealth
  stats: DashboardStats | null
}

export function ServerStatusCard({
  servicesStatus,
  stats,
}: ServerStatusCardProps) {
  const ability = useAbility(AbilityContext)
  const canManageStorage = ability.can('manage_storage', 'Stats')
  const canDeleteMedia = ability.can('delete_media', 'Stats')
  const [storageModalOpen, setStorageModalOpen] = useState(false)

  const isOnline = servicesStatus.emby === 'online'
  const serverName = servicesStatus.serverType === 'jellyfin' ? 'Jellyfin' : 'Emby'
  return (
    <>
      <div className={DASHBOARD_CARD}>
        <div className="flex items-center justify-between mb-2">
          <span className={DASHBOARD_EYEBROW}>État du serveur</span>
          <Activity className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`relative w-2 h-2 shrink-0 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
              {isOnline && <span className="absolute inset-0 rounded-full bg-green-500 animate-onyx-ping" />}
            </span>
            <span className="text-sm font-medium text-gray-100 truncate">{serverName}</span>
          </div>
          <span className={`text-[11px] font-semibold tracking-wide ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            {isOnline ? 'OPÉRATIONNEL' : 'HORS LIGNE'}
          </span>
        </div>

        {stats?.disk && (
          <button
            type="button"
            onClick={() => canManageStorage && setStorageModalOpen(true)}
            disabled={!canManageStorage}
            className={`mt-2 w-full text-left rounded-lg -mx-1 px-1 py-1 ${
              canManageStorage ? 'cursor-pointer hover:bg-white/5 transition-colors' : 'cursor-default'
            }`}
            title={canManageStorage ? 'Ouvrir la gestion du stockage' : undefined}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-400">
                <HardDrive className="w-3.5 h-3.5" />
                Stockage
              </span>
              <span className="text-gray-200 font-medium tabular-nums">
                <CountUp value={`${stats.disk.used} / ${stats.disk.total}`} />
                <span className="text-gray-500 font-normal"> · {Math.round(stats.disk.percent)} %</span>
              </span>
            </div>
            <div className="w-full bg-gray-800/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`onyx-grow h-full transition-all duration-1000 ${
                  stats.disk.percent > 90
                    ? 'bg-red-500'
                    : stats.disk.percent > 70
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${stats.disk.percent}%` }}
              />
            </div>
          </button>
        )}
      </div>

      {storageModalOpen && (
        <MediaManagerModal
          canDelete={canDeleteMedia}
          onClose={() => setStorageModalOpen(false)}
        />
      )}
    </>
  )
}
