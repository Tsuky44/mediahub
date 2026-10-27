import Link from 'next/link'
import { ArrowLeft, Film, Tv, Gamepad2, FileQuestion } from 'lucide-react'
import { formatBytes } from '../_utils/format'
import type { Torrent } from '@/lib/services/qbittorrent'
import type { ParsedTorrentName } from '@/lib/torrent-parser'

interface TorrentDetailsHeaderProps {
  torrent: Torrent
  parsed: ParsedTorrentName
}

export function TorrentDetailsHeader({ torrent, parsed }: TorrentDetailsHeaderProps) {
  const progress = Math.round(torrent.progress * 100)
  const isCompleted = progress === 100
  const isPaused = torrent.state.toLowerCase().includes('pause')
  const isError = torrent.state.toLowerCase().includes('error')
  const isUploading = isCompleted && !isPaused

  const mediaTypeLabel = parsed.mediaType === 'movie' ? 'Film' :
                         parsed.mediaType === 'tv' ? 'Série' :
                         parsed.mediaType === 'game' ? 'Jeu vidéo' : 'Inconnu'

  const mediaColor = parsed.mediaType === 'movie' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                     parsed.mediaType === 'tv' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                     parsed.mediaType === 'game' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                     'text-gray-400 bg-gray-500/10 border-gray-500/20'

  const statusColor = isPaused ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      isError ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      isUploading ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'

  const statusLabel = isPaused ? 'En pause' :
                      isError ? 'Erreur' :
                      isUploading ? 'Partage' :
                      isCompleted ? 'Terminé' :
                      'Téléchargement'

  return (
    <div className="sticky top-0 z-50 bg-[#121414]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/downloads"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white truncate max-w-md sm:max-w-lg lg:max-w-xl">
                {torrent.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${mediaColor}`}>
                  {mediaTypeLabel}
                </span>
                <span>•</span>
                <span>{formatBytes(torrent.size)}</span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
