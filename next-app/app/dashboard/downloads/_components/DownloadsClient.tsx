'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TorrentManager } from './TorrentManager'
import { TorrentStats } from './TorrentStats'
import FileManager from './FileManager'
import { ProwlarrSearch } from '@/components/global/ProwlarrSearch'
import { TrackerStatsCardLazy } from './TrackerStatsCardLazy'
import { CloudArrowDownIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Search } from 'lucide-react'

export interface DownloadsPermissions {
  canReadTorrents: boolean
  canAddTorrent: boolean
  canManageTorrents: boolean
  canReadExplorer: boolean
  canShareFiles: boolean
  canDeleteFiles: boolean
  canInteractiveSearch: boolean
}

export default function DownloadsClient({ 
  hasQbit, 
  hasSmb, 
  hasProwlarr, 
  permissions, 
  isAdmin 
}: { 
  hasQbit: boolean, 
  hasSmb: boolean, 
  hasProwlarr: boolean, 
  permissions: DownloadsPermissions, 
  isAdmin?: boolean 
}) {
  // Determine default tab based on permissions and available services
  const defaultTab = () => {
    if (hasQbit && permissions.canReadTorrents) return 'qbit'
    if (hasSmb && permissions.canReadExplorer) return 'smb'
    if ((hasProwlarr || isAdmin) && permissions.canInteractiveSearch) return 'prowlarr'
    return 'qbit' // Fallback
  }

  const [activeTab, setActiveTab] = useState<'qbit' | 'smb' | 'prowlarr'>(defaultTab())

  return (
    <div className={`space-y-6 mx-auto transition-all duration-300 ${activeTab === 'prowlarr' ? 'w-full max-w-[1800px]' : 'max-w-7xl'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4 px-2">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
                <CloudArrowDownIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Téléchargements</h2>
        </div>
        
        <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 self-start sm:self-center overflow-x-auto max-w-full">
            {hasQbit && permissions.canReadTorrents && (
                <button 
                    onClick={() => setActiveTab('qbit')}
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
                    onClick={() => setActiveTab('smb')}
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
                    onClick={() => setActiveTab('prowlarr')}
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
      
      <div className="transition-all duration-300">
      {activeTab === 'qbit' && permissions.canReadTorrents ? (
        <div className="space-y-6">
            <TrackerStatsCardLazy />
            <TorrentStats />
            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-xl">
                <TorrentManager 
                    canAdd={permissions.canAddTorrent}
                    canManage={permissions.canManageTorrents}
                    canSearch={hasProwlarr && permissions.canInteractiveSearch}
                />
            </div>
        </div>
      ) : activeTab === 'smb' && hasSmb && permissions.canReadExplorer ? (
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
          <FileManager 
            canDownload={true}
            canShare={permissions.canShareFiles}
            canDelete={permissions.canDeleteFiles}
          />
        </div>
      ) : activeTab === 'prowlarr' && permissions.canInteractiveSearch ? (
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
          {!hasProwlarr && isAdmin ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="p-6 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                <Search size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">Prowlarr non configuré</h3>
                <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                    Le service Prowlarr n'est pas encore configuré. 
                    En tant qu'administrateur, vous pouvez le configurer dans les paramètres.
                </p>
              </div>
              <Link 
                href="/dashboard/settings" 
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
              >
                Configurer Prowlarr
              </Link>
            </div>
          ) : (
            <ProwlarrSearch title="" canManage={permissions.canAddTorrent || permissions.canInteractiveSearch} />
          )}
        </div>
      ) : null}
      </div>
    </div>
  )
}
