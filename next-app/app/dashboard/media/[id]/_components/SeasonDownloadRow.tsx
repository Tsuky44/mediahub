'use client'

interface SeasonInfo {
  seasonNumber: number
  status: 'Downloaded' | 'Downloading' | 'Missing' | 'Partial'
  progress?: number
  quality?: string
  size?: string
  language?: string
  dateAdded?: string
  timeleft?: string
  releaseTitle?: string
  isSeasonPack?: boolean
}

interface SeasonDownloadRowProps {
  season: SeasonInfo
  color: string
}

export function SeasonDownloadRow({ season, color }: SeasonDownloadRowProps) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
      <div className="flex items-center gap-3 mb-2">
        <span className="font-bold text-white w-10 shrink-0 text-sm">
          S{season.seasonNumber}
        </span>
        <div className="flex-1">
          <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${color}-500 transition-all duration-500 ease-out`}
              style={{ width: `${season.progress || 0}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-bold text-white shrink-0">
          {season.progress || 0}%
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-2 overflow-hidden">
          {season.releaseTitle && (
            <span className="truncate text-gray-500">{season.releaseTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span>{season.size}</span>
          {season.timeleft && <span className="text-indigo-400">{season.timeleft}</span>}
        </div>
      </div>
    </div>
  )
}
