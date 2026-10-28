'use client'

import { Film, Tv } from 'lucide-react'
import Link from 'next/link'
import { RequestPoster } from './RequestPoster'
import { RequestStatusBadge } from './RequestStatusBadge'
import type { MediaRequest } from './useRecentRequests'

function resolvePosterPaths(request: MediaRequest) {
  const mediaType = request.type === 'movie' ? 'movie' : 'tv'
  const tmdbId = request.media.tmdbId
  const proxyUrl = tmdbId ? `/api/media/image/${tmdbId}?tmdbId=${tmdbId}&mediaType=${mediaType}` : null

  let posterPath: string | null = null
  let fallbackPosterPath: string | null = null

  if (request.media.posterPath) {
    if (request.media.posterPath.startsWith('http')) {
      posterPath = request.media.posterPath
      fallbackPosterPath = proxyUrl
    } else if (
      request.media.posterPath.startsWith('/api/v3/mediacover') ||
      request.media.posterPath.startsWith('/api/mediacover') ||
      request.media.posterPath === 'null' ||
      request.media.posterPath === 'undefined' ||
      request.media.posterPath === ''
    ) {
      posterPath = proxyUrl
    } else {
      const cleanPath = request.media.posterPath.startsWith('/') ? request.media.posterPath : `/${request.media.posterPath}`
      posterPath = `https://image.tmdb.org/t/p/w92${cleanPath}`
      fallbackPosterPath = proxyUrl
    }
  } else if (tmdbId) {
    posterPath = proxyUrl
  }

  return { posterPath, fallbackPosterPath }
}

interface RequestItemProps {
  request: MediaRequest
}

export function RequestItem({ request }: RequestItemProps) {
  const { posterPath, fallbackPosterPath } = resolvePosterPaths(request)
  const detailUrl = request.media.tmdbId
    ? `/dashboard/media/${request.media.tmdbId}?type=${request.type === 'movie' ? 'movie' : 'tv'}`
    : undefined

  const Wrapper = detailUrl ? Link : 'div'

  return (
    <Wrapper
      href={detailUrl || ''}
      className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-indigo-500/30 transition-all group cursor-pointer"
    >
      <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-gray-800">
        <RequestPoster
          src={posterPath}
          alt={request.media.title}
          fallbackSrc={fallbackPosterPath}
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-gray-800">
              {request.type === 'movie' ? (
                <Film className="w-4 h-4 text-gray-600" />
              ) : (
                <Tv className="w-4 h-4 text-gray-600" />
              )}
            </div>
          }
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
          {request.media.title}
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
          Par {request.requestedBy.displayName}
        </p>
        {request.type !== 'movie' && request.media.seasons && request.media.seasons.length > 0 && (
          <p className="text-[10px] text-indigo-400/70 mt-0.5 truncate">
            {request.media.seasons.length === 1
              ? `Saison ${request.media.seasons[0]}`
              : `Saisons ${request.media.seasons.join(', ')}`}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <RequestStatusBadge status={request.status} awaitingRelease={request.awaitingRelease} releaseDate={request.releaseDate} />
      </div>
    </Wrapper>
  )
}
