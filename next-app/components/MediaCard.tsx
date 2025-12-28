import Image from 'next/image'
import { Link, Film, Tv, Check, Clock } from 'lucide-react'

interface MediaItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type?: string
  overview?: string
  media_status?: {
      available: boolean
      status: string
      message: string
  }
  tmdbId?: number
}

export function MediaCard({ item }: { item: MediaItem }) {
  const title = item.title || item.name || 'Untitled'
  
  // Use TMDB ID for linking if available, otherwise fallback to item.id (which might be Emby ID)
  // If item has tmdbId property (from Emby mapping), use it.
  // Otherwise use item.id (standard TMDB result).
  const linkId = item.tmdbId || item.id

  let posterUrl = '/placeholder.png'
  if (item.poster_path) {
      if (item.poster_path.startsWith('http')) {
          posterUrl = item.poster_path
      } else {
          posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`
      }
  }

  const getStatusBadge = () => {
      if (!item.media_status || item.media_status.status === 'not_available' || item.media_status.status === 'unknown') return null

      const status = item.media_status.status
      let colorClass = ''
      let Icon = Check

      if (status === 'available') {
          colorClass = 'bg-green-600'
      } else if (status === 'partial') {
          colorClass = 'bg-purple-600'
      } else if (status === 'pending' || status === 'processing') {
          colorClass = 'bg-yellow-500'
          Icon = status === 'processing' ? Clock : Check // User asked for check but clock might be better? User specifically said "coche jaune" (yellow check). So let's stick to Check for pending too, or maybe just Check for all as requested.
          // "petit coche jaune pour dire que la demande est en pending" -> Yellow check.
      } else {
          return null
      }

      return (
          <div 
              className={`absolute top-2 left-2 rounded-full p-1.5 shadow-lg backdrop-blur-md ${colorClass} text-white z-10`}
              title={item.media_status.message}
          >
              <Icon className="h-4 w-4" strokeWidth={3} />
          </div>
      )
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[2/3] w-full overflow-hidden bg-gray-900 relative">
        {item.poster_path ? (
             <img
             src={posterUrl}
             alt={title}
             className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
             loading="lazy"
           />
        ) : (
            <div className="flex h-full items-center justify-center bg-gray-800 text-gray-500">
                No Image
            </div>
        )}
        
        {getStatusBadge()}
        
        {/* Type Badge */}
        {item.media_type && (
            <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1">
                {item.media_type === 'movie' ? (
                    <>
                        <Film className="h-3 w-3" />
                        <span>Film</span>
                    </>
                ) : (
                    <>
                        <Tv className="h-3 w-3" />
                        <span>Série</span>
                    </>
                )}
            </div>
        )}
       
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-medium text-white">
          <a href={`/dashboard/media/${linkId}?type=${item.media_type || 'movie'}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {title}
          </a>
        </h3>
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{item.overview}</p>
      </div>
    </div>
  )
}
