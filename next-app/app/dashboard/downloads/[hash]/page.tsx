import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { getTorrentDetails, formatBytes, formatSpeed, formatDuration, getTorrentPageUrl, getTrackerInfo, MediaInfo } from './actions'
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Clock, 
  HardDrive, 
  Users, 
  ExternalLink, 
  Film, 
  Tv, 
  Gamepad2, 
  FileQuestion,
  Calendar,
  Star,
  Play,
  Pause,
  Trash2,
  FolderOpen,
  Link as LinkIcon,
  Info
} from 'lucide-react'

interface TorrentDetailsPageProps {
  params: Promise<{ hash: string }>
}

export default async function TorrentDetailsPage({ params }: TorrentDetailsPageProps) {
  const { hash } = await params

  // Check authentication
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!user) {
    redirect('/login')
  }

  const ability = defineAbilityFor(user)
  
  if (ability.cannot('read', 'Downloads')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
        <div className="p-6 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20">
          <Info size={64} />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-3xl font-bold text-white">Accès restreint</h2>
          <p className="text-gray-400 text-lg">
            Vous n'avez pas les permissions nécessaires pour consulter les détails des torrents.
          </p>
        </div>
        <Link 
          href="/dashboard/downloads" 
          className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux téléchargements</span>
        </Link>
      </div>
    )
  }

  // Get torrent details
  const data = await getTorrentDetails(hash)

  if (!data) {
    notFound()
  }

  const { torrent, parsed, mediaInfo } = data

  // Determine icon based on media type
  const MediaIcon = parsed.mediaType === 'movie' ? Film : 
                   parsed.mediaType === 'tv' ? Tv : 
                   parsed.mediaType === 'game' ? Gamepad2 : FileQuestion

  const mediaTypeLabel = parsed.mediaType === 'movie' ? 'Film' : 
                         parsed.mediaType === 'tv' ? 'Série' : 
                         parsed.mediaType === 'game' ? 'Jeu vidéo' : 'Inconnu'

  const mediaColor = parsed.mediaType === 'movie' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                     parsed.mediaType === 'tv' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                     parsed.mediaType === 'game' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                     'text-gray-400 bg-gray-500/10 border-gray-500/20'

  // Calculate progress
  const progress = Math.round(torrent.progress * 100)
  const isCompleted = progress === 100
  const isPaused = torrent.state.toLowerCase().includes('pause')
  const isError = torrent.state.toLowerCase().includes('error')
  const isUploading = isCompleted && !isPaused

  // Get tracker info - handle empty or multiple trackers
  let rawTracker = torrent.tracker || ''
  
  // If torrent.tracker is empty, try to get trackers from API
  if (!rawTracker) {
    try {
      const qbtService = await getQBittorrentService()
      if (qbtService) {
        const trackers = await qbtService.getTorrentTrackers(torrent.hash)
        // Find first non-DHT/PeX/LSD tracker
        const validTracker = trackers?.find(t => 
          t.url && 
          !t.url.includes('dht') && 
          !t.url.includes('pex') && 
          !t.url.includes('lsd') &&
          !t.url.includes('**') &&
          t.tier >= 0
        )
        if (validTracker) {
          rawTracker = validTracker.url
        }
      }
    } catch (e) {
      console.error('Failed to get trackers from API:', e)
    }
  }
  
  // qBittorrent can return multiple trackers separated by newlines or commas
  const firstTracker = rawTracker.split(/[\n,]/)[0].trim()
  const trackerInfo = firstTracker ? await getTrackerInfo(firstTracker) : null
  const trackerName = trackerInfo?.name || 'Inconnu'

  // Try to get direct torrent page URL (from cache, torrent comment, or Prowlarr)
  // Pass the tracker URL to filter Prowlarr results by the correct indexer
  const torrentPageUrl = await getTorrentPageUrl(torrent.hash, torrent.name, torrent.size, firstTracker)
  const trackerUrl = torrentPageUrl || trackerInfo?.baseUrl || null

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-300">
      {/* Header with back button */}
      <div className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/downloads"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white truncate max-w-md sm:max-w-lg lg:max-w-xl">
                  {torrent.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${mediaColor}`}>
                    {mediaTypeLabel}
                  </span>
                  <span>•</span>
                  <span>{await formatBytes(torrent.size)}</span>
                </div>
              </div>
            </div>
            
            {/* Status badge */}
            <span className={`
              px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border
              ${isPaused ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                isError ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                isUploading ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-blue-500/10 text-blue-400 border-blue-500/20'}
            `}>
              {isPaused ? 'En pause' :
               isError ? 'Erreur' :
               isUploading ? 'Partage' :
               isCompleted ? 'Terminé' :
               'Téléchargement'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Media Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Media Details Card */}
            {mediaInfo && (
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
                  <div className="flex items-start gap-4">
                    {/* Poster */}
                    {mediaInfo.posterUrl && (
                      <div className="hidden sm:block flex-shrink-0">
                        <img 
                          src={mediaInfo.posterUrl}
                          alt={mediaInfo.title}
                          className="w-24 sm:w-32 rounded-lg shadow-lg border border-white/10"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <MediaIcon className={`w-6 h-6 ${
                          parsed.mediaType === 'movie' ? 'text-blue-400' :
                          parsed.mediaType === 'tv' ? 'text-purple-400' :
                          parsed.mediaType === 'game' ? 'text-emerald-400' :
                          'text-gray-400'
                        }`} />
                        {mediaInfo.tmdbId ? (
                          <Link 
                            href={`/dashboard/media/${mediaInfo.tmdbId}?type=${mediaInfo.type}`}
                            className="text-2xl font-bold text-white hover:text-indigo-400 transition-colors"
                          >
                            {mediaInfo.title}
                          </Link>
                        ) : (
                          <h2 className="text-2xl font-bold text-white">
                            {mediaInfo.title}
                          </h2>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
                        {mediaInfo.year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {mediaInfo.year}
                          </span>
                        )}
                        {mediaInfo.rating && (
                          <span className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            {mediaInfo.rating.toFixed(1)}
                          </span>
                        )}
                        {mediaInfo.genres && mediaInfo.genres.length > 0 && (
                          <span className="text-gray-500">
                            {mediaInfo.genres.slice(0, 3).join(' • ')}
                          </span>
                        )}
                      </div>
                      
                      {mediaInfo.overview && (
                        <p className="text-gray-300 leading-relaxed line-clamp-4">
                          {mediaInfo.overview}
                        </p>
                      )}
                      
                      {/* External link */}
                      {mediaInfo.externalUrl && (
                        <a 
                          href={mediaInfo.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Voir sur {parsed.mediaType === 'game' ? 'IGDB/Steam' : 'TMDB'}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional info for games */}
                  {parsed.mediaType === 'game' && mediaInfo && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                      {mediaInfo.platforms && mediaInfo.platforms.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-bold">Plateformes</span>
                          <p className="text-sm text-gray-300 mt-1">{mediaInfo.platforms.slice(0, 3).join(', ')}</p>
                        </div>
                      )}
                      {mediaInfo.developers && mediaInfo.developers.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-bold">Développeur</span>
                          <p className="text-sm text-gray-300 mt-1">{mediaInfo.developers[0]}</p>
                        </div>
                      )}
                      {mediaInfo.gameModes && mediaInfo.gameModes.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-bold">Modes de jeu</span>
                          <p className="text-sm text-gray-300 mt-1">{mediaInfo.gameModes.slice(0, 2).join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Cast for movies/TV */}
                  {parsed.mediaType !== 'game' && mediaInfo?.cast && mediaInfo.cast.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                      <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Casting principal</h3>
                      <div className="flex flex-wrap gap-2">
                        {mediaInfo.cast.slice(0, 8).map((actor, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 bg-white/5 rounded-full text-sm text-gray-300 border border-white/5"
                          >
                            {actor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* If no media info found */}
            {!mediaInfo && (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-8 text-center">
                <Info className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Aucune information trouvée</h3>
                <p className="text-gray-400 text-sm">
                  Impossible de trouver des informations sur {parsed.mediaType === 'game' ? 'ce jeu' : 'ce média'}.
                  <br />
                  Titre détecté : <span className="text-gray-300">{parsed.title}</span>
                </p>
              </div>
            )}
            
            {/* Torrent Info */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Informations du torrent</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-2">
                    <HardDrive className="w-4 h-4" />
                    Taille
                  </div>
                  <p className="text-white font-bold">{await formatBytes(torrent.size)}</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    Téléchargé
                  </div>
                  <p className="text-white font-bold">{await formatBytes(torrent.downloaded)}</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Partagé
                  </div>
                  <p className="text-white font-bold">{await formatBytes(torrent.uploaded)}</p>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Ratio
                  </div>
                  <p className={`font-bold ${
                    torrent.ratio >= 1 ? 'text-emerald-400' : 
                    torrent.ratio >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {torrent.ratio.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Parsed info */}
              <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {parsed.quality && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Qualité</span>
                    <p className="text-gray-300 mt-1">{parsed.quality}</p>
                  </div>
                )}
                {parsed.source && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Source</span>
                    <p className="text-gray-300 mt-1">{parsed.source}</p>
                  </div>
                )}
                {parsed.codec && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Codec</span>
                    <p className="text-gray-300 mt-1">{parsed.codec}</p>
                  </div>
                )}
                {parsed.language && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Langue</span>
                    <p className="text-gray-300 mt-1">{parsed.language}</p>
                  </div>
                )}
                {parsed.releaseGroup && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Release Group</span>
                    <p className="text-gray-300 mt-1">{parsed.releaseGroup}</p>
                  </div>
                )}
                {parsed.platform && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Plateforme</span>
                    <p className="text-gray-300 mt-1">{parsed.platform}</p>
                  </div>
                )}
                {parsed.season && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Saison</span>
                    <p className="text-gray-300 mt-1">{parsed.season}</p>
                  </div>
                )}
                {parsed.episode && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase font-bold">Épisode</span>
                    <p className="text-gray-300 mt-1">
                      {parsed.episodeRange 
                        ? `${parsed.episodeRange.start}-${parsed.episodeRange.end}`
                        : parsed.episode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column - Download Status */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Progression</h3>
              
              <div className="text-center mb-6">
                <span className="text-5xl font-black text-white">{progress}%</span>
              </div>
              
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isPaused ? 'bg-gray-600' :
                    isUploading ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                    'bg-gradient-to-r from-blue-600 to-blue-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">Vitesse DL</span>
                  <p className="text-blue-400 font-bold">{await formatSpeed(torrent.dlspeed)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">Vitesse UL</span>
                  <p className="text-emerald-400 font-bold">{await formatSpeed(torrent.upspeed)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">Seeds</span>
                  <p className="text-white font-bold">{torrent.num_seeds}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">Leechs</span>
                  <p className="text-white font-bold">{torrent.num_leechs}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">ETA</span>
                  <p className="text-white font-bold">{await formatDuration(torrent.eta)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase font-bold">Disponibilité</span>
                  <p className="text-white font-bold">
                    {torrent.availability === -1 ? '∞' : torrent.availability.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tracker Info */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Tracker</h3>

              <div className="flex items-center gap-3 mb-4">
                {firstTracker ? (
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg font-bold text-xs uppercase">
                    {trackerName}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-lg font-bold text-xs uppercase">
                    Inconnu
                  </span>
                )}
              </div>

              {trackerUrl ? (
                <a
                  href={trackerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  {torrentPageUrl ? 'Voir la page du torrent' : 'Visiter le site du tracker'}
                </a>
              ) : firstTracker ? (
                <span className="text-sm text-gray-500">
                  Lien non disponible pour ce tracker
                </span>
              ) : null}
            </div>
            
            {/* Tags */}
            {torrent.tags && (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {torrent.tags.split(',').map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-white/5 rounded-lg text-sm text-gray-300 border border-white/5"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Category */}
            {torrent.category && (
              <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Catégorie</h3>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm">
                  {torrent.category}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

