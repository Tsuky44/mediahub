'use client'

import { ArrowDownCircle, Download } from 'lucide-react'
import { useDownloadStatus } from './_hooks/useDownloadStatus'
import { getStatusText, getStatusColor } from './_utils/download-status'
import { MovieDownloadProgress } from './_components/MovieDownloadProgress'
import { SeasonDownloadRow } from './_components/SeasonDownloadRow'
import { AvailableSeasonsList } from './_components/AvailableSeasonsList'

interface DownloadStatusCardProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  tvdbId?: number
  title?: string
}

export function DownloadStatusCard({ tmdbId, mediaType, tvdbId, title }: DownloadStatusCardProps) {
  const { status, loading } = useDownloadStatus(tmdbId, mediaType, tvdbId, title)

  if (!status && !loading) return null
  if (!status) return null
  if (!status.isDownloading && status.status === 'Missing') return null

  const color = getStatusColor(status.status)
  const isTv = mediaType === 'tv'

  const downloadingSeasons =
    isTv && status.seasons ? status.seasons.filter(s => s.status === 'Downloading') : []
  const availableSeasons =
    isTv && status.seasons ? status.seasons.filter(s => s.status !== 'Missing' && s.status !== 'Downloading') : []
  const hasDownloadingSeasons = downloadingSeasons.length > 0
  const hasAvailableSeasons = availableSeasons.length > 0

  return (
    <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 bg-${color}-500/20 rounded-lg ${status.isDownloading ? 'animate-pulse' : ''}`}>
          <ArrowDownCircle className={`h-5 w-5 text-${color}-400`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{getStatusText(status.status)}</h3>
          <p className={`text-xs text-${color}-300 truncate`}>{status.title}</p>
        </div>
        {status.isDownloading && (
          <div className="text-right">
            <span className="text-sm font-bold text-white">{status.progress}%</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!isTv && status.isDownloading && (
          <MovieDownloadProgress status={status} color={color} />
        )}

        {hasDownloadingSeasons && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>En cours ({downloadingSeasons.length})</span>
            </div>
            <div className="space-y-2">
              {downloadingSeasons.map(season => (
                <SeasonDownloadRow key={season.seasonNumber} season={season} color={color} />
              ))}
            </div>
          </div>
        )}

        {hasAvailableSeasons && <AvailableSeasonsList seasons={availableSeasons} />}
      </div>
    </div>
  )
}
