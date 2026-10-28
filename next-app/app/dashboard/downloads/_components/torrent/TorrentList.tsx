'use client'

import { TorrentRow } from './TorrentRow'
import type { VisibleColumns } from '../../_hooks/useVisibleColumns'
import type { Torrent } from '@/lib/services/qbittorrent'

interface TorrentListProps {
  torrents: Torrent[]
  filteredTorrents: Torrent[]
  loading: boolean
  searchQuery: string
  selectedTorrents: string[]
  visibleColumns: VisibleColumns
  canManage: boolean
  onToggleSelect: (hash: string) => void
  onDelete: (torrent: { hash: string; name: string }) => void
  onPause: (hash: string) => void | Promise<void>
  onResume: (hash: string) => void | Promise<void>
}

export function TorrentList({
  torrents,
  filteredTorrents,
  loading,
  searchQuery,
  selectedTorrents,
  visibleColumns,
  canManage,
  onToggleSelect,
  onDelete,
  onPause,
  onResume,
}: TorrentListProps) {
  if (loading && torrents.length === 0) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  if (filteredTorrents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {searchQuery ? 'Aucun torrent trouvé pour cette recherche' : 'Aucun torrent trouvé'}
      </div>
    )
  }

  return (
    <div className="onyx-stagger grid grid-cols-1 gap-3">
      {filteredTorrents.map((torrent) => (
        <TorrentRow
          key={torrent.hash}
          torrent={torrent}
          isSelected={selectedTorrents.includes(torrent.hash)}
          visibleColumns={visibleColumns}
          canManage={canManage}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </div>
  )
}
