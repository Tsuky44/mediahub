'use client'

import { useDownloadStatus } from '../../_hooks/useDownloadStatus'
import { ArrowDownCircle } from 'lucide-react'

interface MediaDownloadProgressBarProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  tvdbId?: number
  title?: string
}

export function MediaDownloadProgressBar({
  tmdbId,
  mediaType,
  tvdbId,
  title,
}: MediaDownloadProgressBarProps) {
  const { status, loading } = useDownloadStatus(tmdbId, mediaType, tvdbId, title)

  if (loading || !status || !status.isDownloading) return null

  const isImporting = status.progress === 100

  if (isImporting) {
    return (
      <div className="w-full max-w-xl bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between text-xs font-bold text-gray-400">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </div>
            <span className="text-yellow-400 font-bold">Importation en cours, veuillez patienter...</span>
          </div>
          <span className="text-yellow-400 text-[10px] bg-yellow-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
            Importation
          </span>
        </div>
        <div className="mt-2 text-[10px] text-gray-500 truncate max-w-[400px] sm:max-w-md">
          Mise à disposition par {mediaType === 'tv' ? 'Sonarr' : 'Radarr'} • {status.releaseTitle || status.title}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="h-4 w-4 text-indigo-400 animate-pulse" />
          <span className="text-white">Téléchargement en cours...</span>
        </div>
        <div className="flex items-center gap-3">
          {status.speed && <span className="text-[10px] text-gray-500">{status.speed}</span>}
          <span className="text-indigo-400 font-extrabold">{status.progress}%</span>
        </div>
      </div>

      <div className="relative h-2 w-full bg-gray-850 rounded-full overflow-hidden border border-white/5 mb-1.5">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${status.progress}%`,
            background: 'linear-gradient(90deg, #9a9794, #e8e6e4)',
            boxShadow: '0 0 8px rgba(232,230,228,0.2)',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span className="truncate max-w-[240px] sm:max-w-xs">{status.releaseTitle || status.title}</span>
        <span className="shrink-0 flex items-center gap-1.5 font-medium">
          <span>{status.sizeLeft} restants</span>
          {status.timeleft && (
            <>
              <span>•</span>
              <span className="text-indigo-300 font-semibold">{status.timeleft}</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
