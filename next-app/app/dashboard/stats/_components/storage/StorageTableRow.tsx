'use client'

import { Film, Tv, Play, Trash2 } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'
import { formatBytes } from '../../_utils/storage-formatters'

interface StorageTableRowProps {
  item: StorageItem
  onSelect: (item: StorageItem) => void
  onDelete: (item: StorageItem, e: React.MouseEvent) => void
}

export function StorageTableRow({ item, onSelect, onDelete }: StorageTableRowProps) {
  return (
    <tr
      key={item.id}
      onClick={() => onSelect(item)}
      className="hover:bg-white/5 transition-colors cursor-pointer group"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
          </div>
          <div>
            <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{item.name}</div>
            {item.type === 'Series' && (
              <div className="text-xs text-gray-500">{item.episodesCount} épisodes</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right text-gray-300 font-mono">
        {formatBytes(item.size)}
      </td>
      <td className="px-6 py-4 text-center">
        {item.isPlaying ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <Play size={10} className="fill-current" />
            Lecture par {item.activeUser}
          </span>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={(e) => onDelete(item, e)}
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}
