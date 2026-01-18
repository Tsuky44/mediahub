'use client'

import { useState } from 'react'
import { TorrentManager } from './TorrentManager'
import FileManager from './FileManager'
import { ProwlarrSearch } from '../media/[id]/ProwlarrSearch'
import { CloudArrowDownIcon, FolderIcon } from '@heroicons/react/24/outline'
import { Search } from 'lucide-react'

export default function DownloadsClient({ hasQbit, hasSmb, hasProwlarr, canManage }: { hasQbit: boolean, hasSmb: boolean, hasProwlarr: boolean, canManage: boolean }) {
  const [activeTab, setActiveTab] = useState<'qbit' | 'smb' | 'prowlarr'>(
    hasQbit ? 'qbit' : hasSmb ? 'smb' : hasProwlarr ? 'prowlarr' : 'qbit'
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
            {hasProwlarr && (
                <button 
                    onClick={() => setActiveTab('prowlarr')}
                    className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeTab === 'prowlarr' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    <Search className="w-5 h-5 mr-2" />
                    Recherche Prowlarr
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
          <ProwlarrSearch title="" canManage={canManage} />
        </div>
      )}
    </div>
  )
}
