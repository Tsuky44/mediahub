import { ExternalLink, Star, Calendar, Clock, Tv, Gamepad2, Users, Clapperboard, Globe, Languages, Info, Film, Tv2, User } from 'lucide-react'
import Link from 'next/link'
import type { MediaInfo, RelatedRequest } from '../actions'
import type { ParsedTorrentName } from '@/lib/torrent-parser'
import { formatBytes } from '../_utils/format'

interface MediaInfoCardProps {
  mediaInfo: MediaInfo
  torrentHash: string
  parsed: ParsedTorrentName
  relatedRequests: RelatedRequest[]
}

export function MediaInfoCard({ mediaInfo, torrentHash, parsed, relatedRequests }: MediaInfoCardProps) {
  const isGame = parsed.mediaType === 'game'
  const hasInternalLink = !isGame && mediaInfo.tmdbId

  return (
    <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden">
      {/* Backdrop image if available */}
      {mediaInfo.backdropUrl && (
        <div className="relative h-48 sm:h-64">
          <img loading="lazy"
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
              <img loading="lazy"
                src={mediaInfo.posterUrl}
                alt={mediaInfo.title}
                className="w-32 sm:w-40 rounded-xl shadow-lg"
              />
            </div>
          )}

          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-bold text-white">{mediaInfo.title}</h2>

            {/* Slogan / Tagline */}
            {mediaInfo.tagline && (
              <p className="text-sm italic text-gray-400">"{mediaInfo.tagline}"</p>
            )}

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

              {/* Status */}
              {mediaInfo.status && (
                <span className="flex items-center gap-1">
                  <Info size={14} />
                  {mediaInfo.status}
                </span>
              )}

              {/* Language */}
              {mediaInfo.original_language && (
                <span className="flex items-center gap-1">
                  <Languages size={14} />
                  {mediaInfo.original_language}
                </span>
              )}
            </div>

            {/* Additional metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {mediaInfo.studios && mediaInfo.studios.length > 0 && (
                <span className="flex items-center gap-1">
                  <Clapperboard size={12} />
                  {mediaInfo.studios.slice(0, 3).join(', ')}
                </span>
              )}
              {mediaInfo.countries && mediaInfo.countries.length > 0 && (
                <span className="flex items-center gap-1">
                  <Globe size={12} />
                  {mediaInfo.countries.join(', ')}
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

            {/* Related Requests */}
            {relatedRequests.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Demandes liées</span>
                <div className="flex flex-wrap gap-2">
                  {relatedRequests.map((req) => {
                    const statusColors: Record<number, string> = {
                      5: 'bg-green-500/10 text-green-400 border-green-500/20',
                      4: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                      3: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      2: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                      1: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    }
                    const statusLabels: Record<number, string> = {
                      5: 'Disponible',
                      4: 'Partiel',
                      3: 'En cours',
                      2: 'Approuvée',
                      1: 'En attente',
                    }
                    const colorClass = statusColors[req.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    const label = statusLabels[req.status] || 'Inconnu'
                    const requester = req.requesterName || req.requesterEmail?.split('@')[0] || 'Inconnu'

                    return (
                      <Link
                        key={req.id}
                        href={`/dashboard/media/${mediaInfo.tmdbId}?type=${parsed.mediaType}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${colorClass}`}
                        title={`Demande #${req.id} — ${label}`}
                      >
                        <User size={12} />
                        <span className="truncate max-w-[120px]">{requester}</span>
                        <span className="opacity-60">• {label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Internal or external link */}
            {hasInternalLink ? (
              <Link
                href={`/dashboard/media/${mediaInfo.tmdbId}?type=${parsed.mediaType}`}
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={14} />
                Voir les détails
              </Link>
            ) : mediaInfo.externalUrl ? (
              <a
                href={mediaInfo.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={14} />
                Voir sur TMDB
              </a>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        <div className="p-6 space-y-6">
          <p className="text-gray-300 leading-relaxed">{mediaInfo.overview}</p>

          {/* Cast / Distribution */}
          {mediaInfo.cast && mediaInfo.cast.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribution</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {mediaInfo.cast.map((actor) => (
                  <div key={actor.name} className="flex flex-col items-center text-center p-2 rounded-lg bg-white/5">
                    {actor.profile_path ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                        alt={actor.name}
                        className="w-14 h-14 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center mb-2">
                        <Users size={20} className="text-gray-500" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-white leading-tight">{actor.name}</span>
                    <span className="text-xs text-gray-500 leading-tight mt-0.5">{actor.character}</span>
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
