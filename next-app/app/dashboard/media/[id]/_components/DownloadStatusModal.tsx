'use client'

import { X, ArrowDownCircle, Download, FolderOpen, HardDrive, Cpu, CheckCircle, CalendarClock, Hourglass } from 'lucide-react'
import { OnyxTrack } from '@/components/ui/onyx'
import { formatReleaseDate } from '@/lib/release-date'
import { useDownloadStatus } from '../_hooks/useDownloadStatus'
import { getStatusText, getStatusColor } from '../_utils/download-status'
import { MovieDownloadProgress } from './MovieDownloadProgress'
import { SeasonDownloadRow } from './SeasonDownloadRow'
import { StatusBadge } from './StatusBadge'

interface DownloadStatusModalProps {
  isOpen: boolean
  onClose: () => void
  tmdbId: number
  mediaType: 'movie' | 'tv'
  tvdbId?: number
  title?: string
  /** Statut du média (« unreleased » : demandé mais pas encore sorti) */
  mediaStatus?: string
  releaseDate?: string
}

/** Rien en téléchargement : on explique pourquoi au lieu de laisser un chargement sans fin. */
function NothingDownloading({ mediaType, mediaStatus, releaseDate, onClose }: {
  mediaType: 'movie' | 'tv'
  mediaStatus?: string
  releaseDate?: string
  onClose: () => void
}) {
  const service = mediaType === 'movie' ? 'Radarr' : 'Sonarr'
  const unreleased = mediaStatus === 'unreleased'
  const Icon = unreleased ? CalendarClock : Hourglass
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="onyx-glass-2 w-full max-w-md rounded-3xl p-7 flex flex-col items-center text-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${unreleased ? 'bg-white/10 text-gray-100' : 'bg-amber-500/15 text-amber-400'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-white">
          {unreleased ? 'En attente de sortie' : 'Aucun téléchargement en cours'}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          {unreleased
            ? `${mediaType === 'movie' ? 'Ce film' : 'Cette série'} est surveillé${mediaType === 'movie' ? '' : 'e'} par ${service}. Le téléchargement démarrera automatiquement dès sa sortie${releaseDate ? ` (prévue le ${formatReleaseDate(releaseDate)})` : ''}.`
            : `${service} recherche une version disponible : le téléchargement démarrera dès qu'une source sera trouvée.`}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-5 py-2 text-sm font-semibold rounded-full border border-white/20 bg-white/15 text-white hover:bg-white/20 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

export function DownloadStatusModal({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  tvdbId,
  title,
  mediaStatus,
  releaseDate,
}: DownloadStatusModalProps) {
  // Interrogé seulement quand la fenêtre est ouverte
  const { status, loading } = useDownloadStatus(tmdbId, mediaType, tvdbId, title, isOpen)

  if (!isOpen) return null

  // Première réponse en attente
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="onyx-glass-2 w-full max-w-md rounded-3xl p-8 flex flex-col items-center justify-center gap-4">
          <OnyxTrack className="w-40" />
          <p className="text-sm text-gray-400">Chargement des informations de téléchargement</p>
        </div>
      </div>
    )
  }

  if (!status) {
    return <NothingDownloading mediaType={mediaType} mediaStatus={mediaStatus} releaseDate={releaseDate} onClose={onClose} />
  }

  const color = getStatusColor(status.status)
  const isTv = mediaType === 'tv'

  const downloadingSeasons =
    isTv && status.seasons ? status.seasons.filter(s => s.status === 'Downloading') : []
  const availableSeasons =
    isTv && status.seasons ? status.seasons.filter(s => s.status !== 'Missing' && s.status !== 'Downloading') : []
  
  const hasDownloadingSeasons = downloadingSeasons.length > 0
  const hasAvailableSeasons = availableSeasons.length > 0

  // Calculate total size
  const totalSize = isTv && status.seasons
    ? availableSeasons.reduce((acc, s) => {
        // Simple parser to calculate total GBs (e.g. "14.48 GB" or "17.99 GB")
        if (!s.size) return acc
        const val = parseFloat(s.size)
        if (isNaN(val)) return acc
        return acc + val
      }, 0)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400 flex items-center justify-center ${status.isDownloading ? 'animate-pulse' : ''}`}>
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none mb-1">
                {getStatusText(status.status)}
              </h3>
              <p className="text-xs text-gray-400 font-medium truncate max-w-sm sm:max-w-md">{status.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {/* Movie progress bar */}
          {!isTv && status.isDownloading && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-400">Progression globale</span>
                <span className="text-white">{status.progress}%</span>
              </div>
              <MovieDownloadProgress status={status} color={color} />
            </div>
          )}

          {/* Downloading Seasons Section */}
          {hasDownloadingSeasons && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>En cours de téléchargement ({downloadingSeasons.length})</span>
              </h4>
              <div className="space-y-3 bg-white/5 border border-white/5 rounded-xl p-4">
                {downloadingSeasons.map(season => (
                  <SeasonDownloadRow key={season.seasonNumber} season={season} color={color} />
                ))}
              </div>
            </div>
          )}

          {/* Available Seasons Section (With sizes and qualities) */}
          {hasAvailableSeasons && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>Saisons disponibles ({availableSeasons.length})</span>
                </h4>
                {totalSize > 0 && (
                  <div className="text-xs text-gray-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    <HardDrive className="h-3.5 w-3.5 text-gray-500" />
                    <span className="font-semibold text-gray-300">Total : {totalSize.toFixed(2)} GB</span>
                  </div>
                )}
              </div>
              
              <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                {availableSeasons.map(season => (
                  <div
                    key={season.seasonNumber}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-extrabold text-xs">
                        S{season.seasonNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">Saison {season.seasonNumber}</span>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/10">
                            {season.quality || 'N/A'}
                          </span>
                        </div>
                        {season.releaseTitle && (
                          <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[280px] sm:max-w-sm font-mono" title={season.releaseTitle}>
                            {season.releaseTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {season.size && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block">{season.size}</span>
                          <span className="text-[9px] text-gray-500 font-medium">Taille disque</span>
                        </div>
                      )}
                      <StatusBadge status={season.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No available or downloading seasons but status is partial */}
          {!hasDownloadingSeasons && !hasAvailableSeasons && (
            <div className="text-center py-8 text-gray-400 italic text-sm">
              Aucun détail de téléchargement n'est disponible pour l'instant.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 bg-gray-950 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-[0_0_15px_rgba(232,230,228,0.12)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  )
}
