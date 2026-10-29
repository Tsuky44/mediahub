import { Download, Upload, Link as LinkIcon } from 'lucide-react'
import type { Torrent } from '@/lib/services/qbittorrent'
import { formatBytes, formatSpeed, formatDuration } from '../_utils/format'

interface TorrentSidebarProps {
  torrent: Torrent
  trackerName: string
  trackerUrl: string | null
  torrentPageUrl: string | null
  firstTracker: string
}

export function TorrentSidebar({ torrent, trackerName, trackerUrl, torrentPageUrl, firstTracker }: TorrentSidebarProps) {
  const progress = Math.round(torrent.progress * 100)

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <div className="bg-gray-900/40 rounded-2xl border border-white/5 p-6 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Progression</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Download size={14} />
              DL Speed
            </div>
            <p className="text-white font-medium">{formatSpeed(torrent.dlspeed)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Upload size={14} />
              UL Speed
            </div>
            <p className="text-white font-medium">{formatSpeed(torrent.upspeed)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-gray-400 text-xs mb-1">Sources</div>
            <p className="text-white font-medium">{torrent.num_seeds}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-gray-400 text-xs mb-1">Clients</div>
            <p className="text-white font-medium">{torrent.num_leechs}</p>
          </div>
        </div>

        {/* ETA */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Temps estimé</span>
          <span className="text-white font-medium">{formatDuration(torrent.eta)}</span>
        </div>

        {/* Size info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Taille totale</span>
          <span className="text-white font-medium">{formatBytes(torrent.size)}</span>
        </div>
      </div>

      {/* Tracker Info */}
      <div className="bg-gray-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tracker</h3>

        <div className="space-y-3">
          <div>
            <span className="text-gray-500 text-xs uppercase font-bold">Nom</span>
            <p className="text-gray-300 mt-1">{trackerName}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase font-bold">URL</span>
            <p className="text-gray-300 mt-1 break-all text-xs">{firstTracker}</p>
          </div>
        </div>

        {torrentPageUrl && (
          <a
            href={torrentPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <LinkIcon size={14} />
            Page du torrent
          </a>
        )}

        {trackerUrl && (
          <a
            href={trackerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <LinkIcon size={14} />
            Site du tracker
          </a>
        )}
      </div>

      {/* Tags */}
      {(() => {
        const tags = typeof torrent.tags === 'string'
          ? torrent.tags.split(',').filter(Boolean).map(t => t.trim())
          : (Array.isArray(torrent.tags) ? torrent.tags : [])
        if (tags.length === 0) return null
        return (
          <div className="bg-gray-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-sm border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Category */}
      {torrent.category && (
        <div className="bg-gray-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Catégorie</h3>
          <span className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-sm border border-white/5">
            {torrent.category}
          </span>
        </div>
      )}
    </div>
  )
}
