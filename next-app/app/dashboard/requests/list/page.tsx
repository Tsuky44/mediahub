import { jellyseerrService } from '@/lib/services/jellyseerr'
import { tmdbService } from '@/lib/services/tmdb'
import { embyService } from '@/lib/services/emby'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CheckCircle2, Clock, Hourglass, User as UserIcon, Tv, Film, Info } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function RequestsListPage() {
  const user = await getCurrentUser()
  if (!user || !user.email) return <div>Non autorisé</div>

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email }
  })
  const embyUserId = dbUser?.embyUserId

  const data = await jellyseerrService.getRequests(100, 0)
  const requests = data.results || []

  // Enrich requests with TMDB data and Emby availability
  const enrichedRequests = await Promise.all(requests.map(async (request: any) => {
      const media = request.media || {}
      let enrichedMedia = { ...media }
      
      // 1. Enrich with TMDB data if missing
      if (!media.title && !media.name && media.tmdbId) {
          try {
              const details = await tmdbService.getDetails(media.tmdbId, request.type)
              if (details) {
                  enrichedMedia = {
                      ...media,
                      title: details.title || details.name,
                      posterPath: details.poster_path,
                      backdropPath: details.backdrop_path
                  }
              }
          } catch (e) {
              console.error(`Failed to enrich request ${request.id}`, e)
          }
      }

      // 2. Check availability on Emby
      let isOnEmby = false
      let embyItemId = null
      
      if (embyUserId && media.tmdbId) {
          try {
              const type = request.type === 'movie' ? 'Movie' : 'Series'
              const embyItem = await embyService.getItemByTmdbId(embyUserId, parseInt(media.tmdbId), type)
              if (embyItem) {
                  isOnEmby = true
                  embyItemId = embyItem.Id
              }
          } catch (e) {
              // Ignore Emby check errors
          }
      }

      return {
          ...request,
          media: enrichedMedia,
          isOnEmby,
          embyItemId,
          seasons: request.seasons || []
      }
  }))

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Mes demandes</h2>
            <p className="text-gray-400 mt-1">Suivez l'état de vos demandes de médias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {enrichedRequests.map((request: any) => {
             const media = request.media || {}
             const posterPath = media.posterPath 
                ? `https://image.tmdb.org/t/p/w300${media.posterPath}` 
                : '/placeholder.png'
             
             const status = request.status
             const statusInfo = {
                 2: { label: 'Approuvée', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
                 1: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock },
                 default: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Hourglass }
             }
             const currentStatus = statusInfo[status as keyof typeof statusInfo] || statusInfo.default
             const StatusIcon = currentStatus.icon

             const requesterName = request.requestedBy?.displayName || request.requestedBy?.email?.split('@')[0] || 'Inconnu'
             
             return (
                <div key={request.id} className="group relative bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden shadow-xl">
                    <div className="flex flex-col md:flex-row">
                        {/* Poster Section */}
                        <div className="relative w-full md:w-40 aspect-[2/3] md:aspect-auto overflow-hidden">
                             <img
                                src={posterPath}
                                alt={media.title || 'Unknown'}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent md:hidden" />
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 p-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                            {request.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                            {request.type === 'movie' ? 'Film' : 'Série'}
                                        </div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                            {media.title || media.name || 'Sans titre'}
                                        </h3>
                                        {request.type === 'tv' && request.seasons && request.seasons.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {request.seasons.map((season: any) => (
                                                    <span key={season.id} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] font-bold text-indigo-400">
                                                        Saison {season.seasonNumber}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color} self-start`}>
                                        <StatusIcon className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{currentStatus.label}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                    {/* Requester Info - More Visible */}
                                    <div className="flex items-center gap-3 bg-gray-800/50 px-3 py-1.5 rounded-xl border border-gray-700/50">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 ring-2 ring-indigo-500/20">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold leading-none">Demandé par</p>
                                            <p className="text-sm font-medium text-gray-200">{requesterName}</p>
                                        </div>
                                    </div>

                                    {/* Availability Indicator */}
                                    {request.isOnEmby ? (
                                        <a 
                                            href={`/dashboard/media/${request.embyItemId}`}
                                            className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all group/btn"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-sm font-semibold">Disponible sur Emby</span>
                                            <Info className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-gray-800/30 px-3 py-1.5 rounded-xl border border-gray-700/30 text-gray-500">
                                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                                            <span className="text-sm font-medium">Non disponible sur Emby</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-800/50 text-xs text-gray-500">
                                <span>ID: {request.id}</span>
                                <span>Ajouté le {new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
             )
          })}
          
          {enrichedRequests.length === 0 && (
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white">Aucune demande trouvée</h3>
                <p className="text-gray-500">Vous n'avez pas encore fait de demande de média.</p>
                <a href="/dashboard/requests" className="mt-6 inline-block bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold transition-all">
                    Faire une demande
                </a>
            </div>
          )}
      </div>
    </div>
  )
}
