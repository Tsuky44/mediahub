import { Clock } from 'lucide-react'
import type { MediaType } from '../../_types/media-page'

interface MediaTitleHeaderProps {
  title: string
  releaseDate?: string
  mediaType: MediaType
  watched: boolean
  contentRating?: string
  runtime?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genres?: any[]
  logoPath?: string
}

export default function MediaTitleHeader({
  title,
  releaseDate,
  mediaType,
  watched,
  contentRating,
  runtime,
  genres,
  logoPath,
}: MediaTitleHeaderProps) {
  return (
    <>
      {logoPath ? (
        <div className="max-w-[280px] sm:max-w-[340px] md:max-w-[420px] animate-fade-in mb-3">
          <img
            src={`https://image.tmdb.org/t/p/original${logoPath}`}
            alt={title}
            className="w-full h-auto max-h-[140px] md:max-h-[180px] object-contain drop-shadow-2xl select-none"
          />
        </div>
      ) : (
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight break-words drop-shadow-lg tracking-tight mb-3">
          {title}{' '}
          <span className="text-gray-500 font-thin">
            ({releaseDate ? new Date(releaseDate).getFullYear() : ''})
          </span>
        </h1>
      )}

      {mediaType === 'movie' && watched && (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-2">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Vu</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-gray-400">
        {logoPath && releaseDate && (
          <span className="text-white font-extrabold text-base">
            {new Date(releaseDate).getFullYear()}
          </span>
        )}
        {contentRating && (
          <span className="border border-white/20 px-2 py-0.5 rounded text-xs text-gray-300 bg-white/5 backdrop-blur-sm">
            {contentRating}
          </span>
        )}
        {runtime !== undefined && runtime > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>
              {Math.floor(runtime / 60)}h {runtime % 60}m
            </span>
          </div>
        )}
        {genres && (
          <div className="flex flex-wrap gap-2">
            {genres.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (g: any) => (
                <span
                  key={g.id}
                  className="text-gray-300 hover:text-white transition-colors cursor-default"
                >
                  • {g.name}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </>
  )
}
