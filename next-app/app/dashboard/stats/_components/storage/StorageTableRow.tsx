'use client'

import { Film, Tv, Trash2 } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'
import { formatBytes, formatLastPlayed } from '../../_utils/storage-formatters'

interface StorageTableRowProps {
  item: StorageItem
  onSelect: (item: StorageItem) => void
  onDelete: (item: StorageItem, e: React.MouseEvent) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}

export function StorageTableRow({ item, onSelect, onDelete, selected, onToggleSelect }: StorageTableRowProps) {
  return (
    <tr
      key={item.id}
      onClick={() => onSelect(item)}
      className={`transition-colors cursor-pointer group ${selected ? 'bg-purple-500/10 hover:bg-purple-500/15' : 'hover:bg-white/5'}`}
    >
      <td className="pl-6 pr-2 py-4 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500/50 bg-gray-800 cursor-pointer"
        />
      </td>
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
        {item.lastPlayedDate ? (
          <span
            className="text-gray-300 text-xs"
            title={new Date(item.lastPlayedDate).toLocaleString('fr-FR')}
          >
            {formatLastPlayed(item.lastPlayedDate)}
          </span>
        ) : (
          <span className="text-gray-600 text-xs">Jamais</span>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        {item.requestedAt ? (
          <span
            className="text-gray-300 text-xs"
            title={new Date(item.requestedAt).toLocaleString('fr-FR')}
          >
            {formatLastPlayed(item.requestedAt)}
          </span>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
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
