import { ExternalLink, Star, Calendar, Clock, Tv, Gamepad2, Users } from 'lucide-react'
import type { MediaInfo } from '../actions'
import type { ParsedTorrentName } from '@/lib/torrent-parser'
import { formatBytes } from '../_utils/format'

interface MediaInfoCardProps {
  mediaInfo: MediaInfo
  torrentHash: string
  parsed: ParsedTorrentName
}

export function MediaInfoCard({ mediaInfo, torrentHash, parsed }: MediaInfoCardProps) {
  return (
    <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
      {/* Backdrop image if available */}
      {mediaInfo.backdropUrl && (
        <div className="relative h-48 sm:h-64">
          <img
            src={mediaInfo.backdropUrl}
            alt={mediaInfo.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Poster */}
          {mediaInfo.posterUrl && (
            <div className="shrink-0">
              <img
                src={mediaInfo.posterUrl}
                alt={mediaInfo.title}
                className="w-32 sm:w-40 rounded-xl shadow-lg"
              />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-bold text-white">{mediaInfo.title}</h2>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              {mediaInfo.year && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {mediaInfo.year}
                </span>
              )}
              {mediaInfo.vote_average !== undefined && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star size={14} className="fill-yellow-400" />
                  {mediaInfo.vote_average.toFixed(1)}
                  {mediaInfo.vote_count && (
                    <span className="text-gray-500">({mediaInfo.vote_count.toLocaleString()} votes)</span>
                  )}
                </span>
              )}

              {/* Movie Info */}
              {parsed.mediaType === 'movie' && mediaInfo.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {Math.floor(mediaInfo.runtime / 60)}h {mediaInfo.runtime % 60}min
                </span>
              )}

              {/* TV Info */}
              {parsed.mediaType === 'tv' && mediaInfo.number_of_seasons && mediaInfo.number_of_episodes && (
                <span className="flex items-center gap-1">
                  <Tv size={14} />
                  {mediaInfo.number_of_seasons} saisons • {mediaInfo.number_of_episodes} épisodes
                </span>
              )}

              {/* Game Info */}
              {mediaInfo.platforms && mediaInfo.platforms.length > 0 && (
                <span className="flex items-center gap-1">
                  <Gamepad2 size={14} />
                  {mediaInfo.platforms.join(', ')}
                </span>
              )}
              {mediaInfo.developers && mediaInfo.developers.length > 0 && (
                <span className="text-gray-500">
                  Développeur{mediaInfo.developers.length > 1 ? 's' : ''}: {mediaInfo.developers.join(', ')}
                </span>
              )}
            </div>

            {/* Genres */}
            {mediaInfo.genres && mediaInfo.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaInfo.genres.map(genre => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-sm border border-white/5"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* External link */}
            <a
              href={`https://www.themoviedb.org/${parsed.mediaType === 'movie' ? 'movie' : parsed.mediaType === 'tv' ? 'tv' : 'game'}/${torrentHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={14} />
              Voir sur TMDB
            </a>
          </div>
        </div>

        {/* Overview */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300 leading-relaxed">{mediaInfo.overview}</p>

          {/* Cast */}
          {mediaInfo.cast && mediaInfo.cast.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {mediaInfo.cast.map((actor) => (
                  <div key={actor.name} className="flex flex-col items-center text-center p-2 rounded-lg bg-white/5">
                    {actor.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                        alt={actor.name}
                        className="w-16 h-16 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-2">
                        <Users size={24} className="text-gray-500" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-white">{actor.name}</span>
                    <span className="text-xs text-gray-500">{actor.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
