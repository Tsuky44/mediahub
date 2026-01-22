'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TorrentManager } from './TorrentManager'
import FileManager from './FileManager'
import { ProwlarrSearch } from '@/components/ProwlarrSearch'
import { CloudArrowDownIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Search } from 'lucide-react'

export default function DownloadsClient({ hasQbit, hasSmb, hasProwlarr, canManage, isAdmin }: { hasQbit: boolean, hasSmb: boolean, hasProwlarr: boolean, canManage: boolean, isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<'qbit' | 'smb' | 'prowlarr'>(
    hasQbit ? 'qbit' : hasSmb ? 'smb' : (hasProwlarr || isAdmin) ? 'prowlarr' : 'qbit'
  )

  return (
    <div className={`space-y-4 mx-auto transition-all duration-300 ${activeTab === 'prowlarr' ? 'w-full max-w-[1800px]' : 'max-w-7xl'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Gestion des fichiers</h2>
        
        <div className="flex bg-gray-800 p-1 rounded-lg self-start">
            {hasQbit && (
                <button 
                    onClick={() => setActiveTab('qbit')}
                    className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeTab === 'qbit' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    <CloudArrowDownIcon className="w-5 h-5 mr-2" />
                    qBittorrent
                </button>
            )}
            {hasSmb && (
                <button 
                    onClick={() => setActiveTab('smb')}
                    className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeTab === 'smb' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    <FolderIcon className="w-5 h-5 mr-2" />
                    Explorateur SMB
                </button>
            )}
            {(hasProwlarr || isAdmin) && (
                <button 
                    onClick={() => setActiveTab('prowlarr')}
                    className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeTab === 'prowlarr' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    <Search className="w-5 h-5 mr-2" />
                    Recherche Interactive
                </button>
            )}
        </div>
      </div>
      
      {activeTab === 'qbit' ? (
        <div className="bg-gray-900/50 rounded-2xl border border-white/5 p-3 sm:p-4">
          <TorrentManager canManage={canManage} />
        </div>
      ) : activeTab === 'smb' ? (
        <div className="bg-gray-900/50 rounded-2xl border border-white/5 p-3 sm:p-4">
          <FileManager canManage={canManage} />
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-2xl border border-white/5 p-3 sm:p-4">
          {!hasProwlarr && isAdmin ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-amber-500/10 text-amber-500">
                <Search size={48} />
              </div>
              <h3 className="text-xl font-bold text-white">Prowlarr non configuré</h3>
              <p className="text-gray-400 max-w-md">
                Le service Prowlarr n'est pas encore configuré. 
                En tant qu'administrateur, vous pouvez le configurer dans les paramètres.
              </p>
              <Link 
                href="/dashboard/settings" 
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Aller aux paramètres
              </Link>
            </div>
          ) : (
            <ProwlarrSearch title="" canManage={canManage} />
          )}
        </div>
      )}
    </div>
  )
}
