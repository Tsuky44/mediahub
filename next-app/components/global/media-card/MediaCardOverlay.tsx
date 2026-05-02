'use client'

import { Film } from 'lucide-react'

interface MediaCardOverlayProps {
  title: string
  mediaType?: string
  overview?: string
}

export function MediaCardOverlay({ title, mediaType, overview }: MediaCardOverlayProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-5">
      <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
        {title}
      </h3>

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-300 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0 delay-75">
        {mediaType === 'tv' ? (
          <span className="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium text-[10px]">
            Série
          </span>
        ) : (
          <span className="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium text-[10px]">
            Film
          </span>
        )}
      </div>

      {overview && (
        <p className="mt-2 text-xs text-gray-300 line-clamp-3 transform translate-y-4 transition-transform duration-300 group-hover:translate-y-0 delay-100 opacity-80 leading-relaxed">
          {overview}
        </p>
      )}
    </div>
  )
}
