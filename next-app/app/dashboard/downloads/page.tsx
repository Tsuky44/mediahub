'use client'

import { useState } from 'react'
import { TorrentManager } from './TorrentManager'
import FileManager from './FileManager'
import { CloudArrowDownIcon, FolderIcon } from '@heroicons/react/24/outline'

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState<'qbit' | 'smb'>('qbit')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">Gestion des fichiers</h2>
        
        <div className="flex bg-gray-800 p-1 rounded-lg self-start">
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
        </div>
      </div>
      
      {activeTab === 'qbit' ? <TorrentManager /> : <FileManager />}
    </div>
  )
}
