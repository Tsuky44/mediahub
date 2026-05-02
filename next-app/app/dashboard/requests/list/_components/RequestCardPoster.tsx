'use client'

import Link from 'next/link'
import { Film } from 'lucide-react'
import { MediaPoster } from './MediaPoster'

interface RequestCardPosterProps {
  tmdbId: number | undefined
  mediaType: string
  posterPath: string | null | undefined
  fallbackPosterPath: string | null | undefined
  title: string
}

export function RequestCardPoster({ tmdbId, mediaType, posterPath, fallbackPosterPath, title }: RequestCardPosterProps) {
  return (
    <Link
      href={`/dashboard/media/${tmdbId}?type=${mediaType}`}
      onClick={(e) => e.stopPropagation()}
      className="relative w-full md:w-40 aspect-[2/3] md:aspect-auto overflow-hidden bg-zinc-800 flex items-center justify-center"
    >
      <MediaPoster
        src={posterPath ?? null}
        fallbackSrc={fallbackPosterPath ?? null}
        alt={title || 'Unknown'}
        placeholder={
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <Film className="w-8 h-8 text-zinc-700 mb-2" />
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider line-clamp-2">
              {title || 'Sans titre'}
            </span>
          </div>
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:hidden" />
    </Link>
  )
}
