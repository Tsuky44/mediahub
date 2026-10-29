import { HardDrive, Download, Upload, Users } from 'lucide-react'
import type { Torrent } from '@/lib/services/qbittorrent'
import type { ParsedTorrentName } from '@/lib/torrent-parser'
import { formatBytes, formatSpeed, formatDuration } from '../_utils/format'

interface TorrentInfoCardProps {
  torrent: Torrent
  parsed: ParsedTorrentName
}

export function TorrentInfoCard({ torrent, parsed }: TorrentInfoCardProps) {
  return (
    <div className="bg-gray-900/40 rounded-2xl border border-white/5 p-6 space-y-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <HardDrive size={16} />
        Informations du torrent
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Taille</span>
          <p className="text-gray-300 mt-1">{formatBytes(torrent.size)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Téléchargé</span>
          <p className="text-gray-300 mt-1">{formatBytes(torrent.downloaded)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Uploadé</span>
          <p className="text-gray-300 mt-1">{formatBytes(torrent.uploaded)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Ratio</span>
          <p className="text-gray-300 mt-1">{torrent.ratio}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Vitesse DL</span>
          <p className="text-gray-300 mt-1">{formatSpeed(torrent.dlspeed)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Vitesse UP</span>
          <p className="text-gray-300 mt-1">{formatSpeed(torrent.upspeed)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Sources</span>
          <p className="text-gray-300 mt-1 flex items-center gap-1">
            <Users size={14} className="text-emerald-400" />
            {torrent.num_seeds}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Clients</span>
          <p className="text-gray-300 mt-1">{torrent.num_leechs}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">ETA</span>
          <p className="text-gray-300 mt-1">{formatDuration(torrent.eta)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs uppercase font-bold">Disponibilité</span>
          <p className="text-gray-300 mt-1">{torrent.availability}</p>
        </div>
      </div>

      {/* Parsed info from torrent name */}
      {(parsed.quality || parsed.source || parsed.codec || parsed.language || parsed.releaseGroup || parsed.platform) && (
        <div className="border-t border-white/5 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Détails techniques</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {parsed.quality && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Qualité</span>
                <p className="text-gray-300 mt-1">{parsed.quality}</p>
              </div>
            )}
            {parsed.source && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Source</span>
                <p className="text-gray-300 mt-1">{parsed.source}</p>
              </div>
            )}
            {parsed.codec && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Codec</span>
                <p className="text-gray-300 mt-1">{parsed.codec}</p>
              </div>
            )}
            {parsed.language && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Langue</span>
                <p className="text-gray-300 mt-1">{parsed.language}</p>
              </div>
            )}
            {parsed.releaseGroup && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Release</span>
                <p className="text-gray-300 mt-1">{parsed.releaseGroup}</p>
              </div>
            )}
            {parsed.platform && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Plateforme</span>
                <p className="text-gray-300 mt-1">{parsed.platform}</p>
              </div>
            )}
            {parsed.season && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Saison</span>
                <p className="text-gray-300 mt-1">{parsed.season}</p>
              </div>
            )}
            {parsed.episode && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Épisode</span>
                <p className="text-gray-300 mt-1">{parsed.episode}</p>
              </div>
            )}
            {parsed.episodeRange && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-bold">Plage d&apos;épisodes</span>
                <p className="text-gray-300 mt-1">{parsed.episodeRange.start} - {parsed.episodeRange.end}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
