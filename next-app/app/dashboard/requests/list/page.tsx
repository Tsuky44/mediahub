import { jellyseerrService } from '@/lib/services/jellyseerr'
import { tmdbService } from '@/lib/services/tmdb'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function RequestsListPage() {
  const data = await jellyseerrService.getRequests(50, 0)
  const requests = data.results || []

  // Enrich requests with TMDB data if title is missing
  const enrichedRequests = await Promise.all(requests.map(async (request: any) => {
      const media = request.media || {}
      if (!media.title && !media.name && media.tmdbId) {
          try {
              const details = await tmdbService.getDetails(media.tmdbId, request.type)
              if (details) {
                  return {
                      ...request,
                      media: {
                          ...media,
                          title: details.title || details.name,
                          posterPath: details.poster_path,
                          backdropPath: details.backdrop_path
                      }
                  }
              }
          } catch (e) {
              console.error(`Failed to enrich request ${request.id}`, e)
          }
      }
      return request
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Mes demandes ({data.total || 0})</h2>

      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow">
        <ul role="list" className="divide-y divide-gray-700">
          {enrichedRequests.map((request: any) => {
             // Debug: check structure if needed. 
             // Jellyseerr V1 usually returns media object.
             const media = request.media || {}
             // Sometimes title is nested or not fully populated.
             // But let's assume standard Jellyseerr behavior for now.
             
             const posterPath = media.posterPath 
                ? `https://image.tmdb.org/t/p/w200${media.posterPath}` 
                : '/placeholder.png'
             
             return (
                <li key={request.id} className="p-4 hover:bg-gray-700 transition-colors">
                <div className="flex items-center space-x-4">
                    <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-700">
                         <img
                            src={posterPath}
                            alt={media.title || 'Unknown'}
                            className="h-full w-full object-cover"
                         />
                    </div>
                    <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                        {media.title || media.name || 'Untitled'}
                    </p>
                    <p className="truncate text-sm text-gray-400">
                        {request.type === 'movie' ? 'Movie' : 'Series'} • Requested by {request.requestedBy?.email || 'Unknown'}
                    </p>
                    </div>
                    <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${request.status === 2 ? 'bg-green-900 text-green-300' : 
                          request.status === 1 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>
                        {request.status === 2 ? 'Approved' : request.status === 1 ? 'Pending' : 'Processing'}
                    </span>
                    </div>
                </div>
                </li>
             )
          })}
          {enrichedRequests.length === 0 && (
            <li className="p-4 text-center text-gray-400">No requests found</li>
          )}
        </ul>
      </div>
    </div>
  )
}
