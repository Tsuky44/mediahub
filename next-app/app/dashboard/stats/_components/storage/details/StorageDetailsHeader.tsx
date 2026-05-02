'use client'

import { Film, Tv, X } from 'lucide-react'
import type { StorageItem } from '../../../_types/storage'
import { formatBytes } from '../../../_utils/storage-formatters'

interface StorageDetailsHeaderProps {
  item: StorageItem
  onClose: () => void
}

export function StorageDetailsHeader({ item, onClose }: StorageDetailsHeaderProps) {
  return (
    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {item.type === 'Movie' ? <Film size={20} /> : <Tv size={20} />}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{item.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{formatBytes(item.size)}</span>
            <span>•</span>
            <span>Ajouté le {new Date(item.addedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
        <X size={24} />
      </button>
    </div>
  )
}
