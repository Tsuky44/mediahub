'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Hourglass, ListPlus, Tv, Film } from 'lucide-react'
import Link from 'next/link'
import { getRecentRequests } from '../dashboard-actions'

interface MediaRequest {
  id: string
  type: string
  status: number
  media: {
    title: string
    posterPath?: string
    tmdbId?: string
  }
  requestedBy: {
    displayName: string
  }
}

const MediaPoster = ({ 
  src, 
  alt, 
  fallbackSrc, 
  placeholder 
}: { 
  src: string | null, 
  alt: string, 
  fallbackSrc?: string | null,
  placeholder: React.ReactNode 
}) => {
  const [error, setError] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(src)

  useEffect(() => {
    setImgSrc(src)
    setError(false)
    setUsingFallback(false)
  }, [src])

  const handleError = () => {
    if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
      setUsingFallback(true)
      setImgSrc(fallbackSrc)
    } else {
      setError(true)
    }
  }

  if (!imgSrc || error) {
    return <>{placeholder}</>
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className="h-full w-full object-cover"
    />
  )
}

export function RecentRequests({ requests: initialRequests }: { requests: MediaRequest[] }) {
  const [requests, setRequests] = useState<MediaRequest[]>(initialRequests)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newRequests = await getRecentRequests()
        // @ts-ignore
        setRequests(newRequests)
      } catch (error) {
        console.error('Failed to update recent requests:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 5: return <CheckCircle2 className="w-3 h-3 text-green-500" />
      case 4: return <CheckCircle2 className="w-3 h-3 text-purple-500" />
      case 3: return <Hourglass className="w-3 h-3 text-blue-500" />
      case 2: return <CheckCircle2 className="w-3 h-3 text-indigo-500" />
      default: return <Clock className="w-3 h-3 text-yellow-500" />
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 5: return 'Disponible'
      case 4: return 'Partiel'
      case 3: return 'En cours'
      case 2: return 'Approuvée'
      default: return 'En attente'
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <ListPlus className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Dernières demandes</h2>
        </div>
        <Link 
          href="/dashboard/requests/list" 
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Voir tout
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 bg-gray-800/50 rounded-full mb-4">
            <ListPlus className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Aucune demande récente.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          <div className="space-y-3">
            {requests.map((request) => {
              const mediaType = request.type === 'movie' ? 'movie' : 'tv'
              const tmdbId = request.media.tmdbId

              let posterPath = null
              let fallbackPosterPath = null
              const proxyUrl = tmdbId ? `/api/media/image/${tmdbId}?tmdbId=${tmdbId}&mediaType=${mediaType}` : null
              
              if (request.media.posterPath) {
                  if (request.media.posterPath.startsWith('http')) {
                      posterPath = request.media.posterPath
                      fallbackPosterPath = proxyUrl
                  } else if (request.media.posterPath.startsWith('/api/v3/mediacover') || 
                            request.media.posterPath.startsWith('/api/mediacover') ||
                            request.media.posterPath === "null" ||
                            request.media.posterPath === "undefined" ||
                            request.media.posterPath === "") {
                      posterPath = proxyUrl
                  } else {
                      const cleanPath = request.media.posterPath.startsWith('/') ? request.media.posterPath : `/${request.media.posterPath}`
                      posterPath = `https://image.tmdb.org/t/p/w92${cleanPath}`
                      fallbackPosterPath = proxyUrl
                  }
              } else if (tmdbId) {
                  posterPath = proxyUrl
              }

              return (
              <div key={request.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:border-indigo-500/30 transition-all group">
                <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                  <MediaPoster 
                    src={posterPath}
                    alt={request.media.title}
                    fallbackSrc={fallbackPosterPath}
                    placeholder={
                      <div className="flex h-full w-full items-center justify-center bg-gray-800">
                        {request.type === 'movie' ? <Film className="w-4 h-4 text-gray-600" /> : <Tv className="w-4 h-4 text-gray-600" />}
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
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800/50 border border-gray-700/50">
                    {getStatusIcon(request.status)}
                    <span className="text-[10px] font-medium text-gray-300">
                      {getStatusText(request.status)}
                    </span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  )
}
