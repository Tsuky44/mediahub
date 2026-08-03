'use client'

import { Film, Tv, Play, Clock, Download, Trash2 } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'
import { formatBytes, formatLastPlayed } from '../../_utils/storage-formatters'

interface StorageMobileItemProps {
  item: StorageItem
  onSelect: (item: StorageItem) => void
  onDelete: (item: StorageItem, e: React.MouseEvent) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}

export function StorageMobileItem({ item, onSelect, onDelete, selected, onToggleSelect }: StorageMobileItemProps) {
  return (
    <div
      key={item.id}
      onClick={() => onSelect(item)}
      className={`p-4 transition-colors cursor-pointer active:bg-white/10 ${selected ? 'bg-purple-500/10' : 'hover:bg-white/5'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect(item.id)}
            className="w-4 h-4 shrink-0 rounded border-gray-600 text-purple-500 focus:ring-purple-500/50 bg-gray-800 cursor-pointer"
          />
          <div className={`p-2 rounded-lg shrink-0 ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-white truncate pr-2">{item.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>{formatBytes(item.size)}</span>
              {item.type === 'Series' && (
                <>
                  <span>•</span>
                  <span>{item.episodesCount} épisodes</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Clock size={11} />
              <span>{formatLastPlayed(item.lastPlayedDate)}</span>
            </div>
            {item.requestedAt && (
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Download size={11} />
                <span>Demandé {formatLastPlayed(item.requestedAt)}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => onDelete(item, e)}
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {item.isPlaying && (
        <div className="mt-2 flex justify-start">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <Play size={10} className="fill-current" />
            Lecture par {item.activeUser}
          </span>
        </div>
      )}
    </div>
  )
}
