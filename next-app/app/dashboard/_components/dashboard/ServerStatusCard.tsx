'use client'

import { useState } from 'react'
import { useAbility } from '@casl/react'
import { Activity, HardDrive } from 'lucide-react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import { MediaManagerModal } from '@/components/global/MediaManagerModal'
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
      <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            État du Serveur
          </span>
          <Activity className="w-4 h-4 text-blue-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-300">{serverName}</span>
            </div>
            <span
              className={`text-xs font-medium ${
                isOnline ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isOnline ? 'OPÉRATIONNEL' : 'HORS LIGNE'}
            </span>
          </div>

          {stats?.disk && (
            <button
              type="button"
              onClick={() => canManageStorage && setStorageModalOpen(true)}
              disabled={!canManageStorage}
              className={`pt-2 border-t border-gray-800/50 w-full text-left ${
                canManageStorage
                  ? 'cursor-pointer rounded-lg -mx-1 px-1 hover:bg-white/5 transition-colors'
                  : 'cursor-default'
              }`}
              title={canManageStorage ? 'Ouvrir la gestion du stockage' : undefined}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2 text-gray-400">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Stockage</span>
                </div>
                <span className="text-[11px] text-gray-300 font-medium">
                  {stats.disk.used} / {stats.disk.total}
                </span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
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
