'use client'

import { CloudArrowDownIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Search } from 'lucide-react'
import type { DownloadsPermissions } from '../DownloadsClient'

interface DownloadsHeaderProps {
  activeTab: 'qbit' | 'smb' | 'prowlarr'
  hasQbit: boolean
  hasSmb: boolean
  hasProwlarr: boolean
  permissions: DownloadsPermissions
  isAdmin?: boolean
  onTabChange: (tab: 'qbit' | 'smb' | 'prowlarr') => void
}

export function DownloadsHeader({
  activeTab,
  hasQbit,
  hasSmb,
  hasProwlarr,
  permissions,
  isAdmin,
  onTabChange,
}: DownloadsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-black/40 border border-white/10 p-4 rounded-3xl shadow-2xl">
      <div className="flex items-center gap-4 px-2">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(232,230,228,0.2)]">
          <CloudArrowDownIcon className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Téléchargements</h2>
      </div>

      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 self-start sm:self-center overflow-x-auto max-w-full">
        {hasQbit && permissions.canReadTorrents && (
          <button
            onClick={() => onTabChange('qbit')}
            className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'qbit'
                ? 'bg-indigo-600 shadow-lg shadow-indigo-500/25 text-white scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CloudArrowDownIcon className="w-4 h-4 mr-2.5" />
            qBittorrent
          </button>
        )}
        {hasSmb && permissions.canReadExplorer && (
          <button
            onClick={() => onTabChange('smb')}
            className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'smb'
                ? 'bg-indigo-600 shadow-lg shadow-indigo-500/25 text-white scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderIcon className="w-4 h-4 mr-2.5" />
            Explorateur
          </button>
        )}
        {(hasProwlarr || isAdmin) && permissions.canInteractiveSearch && (
          <button
            onClick={() => onTabChange('prowlarr')}
            className={`flex items-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'prowlarr'
                ? 'bg-indigo-600 shadow-lg shadow-indigo-500/25 text-white scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4 mr-2.5" />
            Recherche
          </button>
        )}
      </div>
    </div>
  )
}
