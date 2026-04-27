import type { UserProgress } from '../../_types/media-page'

interface MediaProgressBarProps {
  userProgress: UserProgress
  totalEpisodes: number
}

export default function MediaProgressBar({
  userProgress,
  totalEpisodes,
}: MediaProgressBarProps) {
  return (
    <div className="pt-2 max-w-md">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
        <span className="text-gray-400">Progression</span>
        <span className="text-white">
          {Math.round(userProgress.playedPercentage)}%{' '}
          <span className="text-gray-500 ml-1">
            ({totalEpisodes - userProgress.unplayedItemCount}/{totalEpisodes})
          </span>
        </span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${userProgress.playedPercentage}%` }}
        />
      </div>
    </div>
  )
}
