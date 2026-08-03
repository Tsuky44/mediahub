'use client'

import { HardDrive, Film, Tv, Search, RefreshCw, History } from 'lucide-react'
import { formatBytes } from '../../_utils/storage-formatters'

interface StorageManagerHeaderProps {
  totalSize: number
  categorySize: number
  totalsPending?: boolean
  activeTab: 'Movie' | 'Series'
  searchTerm: string
  loading: boolean
  syncing: boolean
  onTabChange: (tab: 'Movie' | 'Series') => void
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onSync: () => void
}

export function StorageManagerHeader({
  totalSize,
  categorySize,
  totalsPending = false,
  activeTab,
  searchTerm,
  loading,
  syncing,
  onTabChange,
  onSearchChange,
  onRefresh,
  onSync,
}: StorageManagerHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HardDrive className="text-purple-400" />
          Gestion du Stockage
        </h2>
        <p className="text-sm text-gray-400">
          Total :{' '}
          <span className="text-white font-medium">
            {totalsPending ? 'Indexation en cours…' : formatBytes(totalSize)}
          </span>
          {' • '}
          <span className={activeTab === 'Movie' ? 'text-blue-400' : 'text-green-400'}>
            {activeTab === 'Movie' ? 'Films' : 'Séries'} :{' '}
            {totalsPending ? '…' : formatBytes(categorySize)}
          </span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/5">
          <button
            onClick={() => onTabChange('Movie')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Movie'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Film size={16} />
              Films
            </span>
          </button>
          <button
            onClick={() => onTabChange('Series')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Series'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tv size={16} />
              Séries
            </span>
          </button>
        </div>

        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
          />
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          className="p-2.5 bg-black/40 backdrop-blur-sm border border-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Synchroniser les dates de lecture depuis Emby"
        >
          <History className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onRefresh}
          className="p-2.5 bg-black/40 backdrop-blur-sm border border-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm hover:shadow-md"
          title="Actualiser"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
