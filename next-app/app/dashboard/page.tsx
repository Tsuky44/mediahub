import { getEmbyServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTmdbService } from '@/lib/services/tmdb'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from './media/actions'
import { RecentlyWatched } from './media/RecentlyWatched'
import { Recommendations } from './media/Recommendations'
import { RecentRequests } from './_components/RecentRequests'
import { QuickActions } from './_components/QuickActions'
import { getSetting } from '@/lib/settings'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { getTorrents } from './downloads/actions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { WelcomePopup } from './_components/WelcomePopup'
import { ReleaseCalendar } from '@/components/global/ReleaseCalendar'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const ability = defineAbilityFor(user)
  const userRole = user?.role || 'user'
  const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
  const userId = user?.id ? parseInt(user.id) : NaN

  if (isNaN(userId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
        <p className="text-gray-400">Impossible d'identifier votre session. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  const embyService = await getEmbyServiceForUser()

  // Check if user has seen welcome popup
  const dbUser = await prisma.user.findUnique({
    where: { 
      id: userId
    }
  })
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['emby_url', 'qbittorrent_url', 'smb_host', 'docker_host', 'unraid_url', 'welcome_message_enabled'] } },
    select: { key: true, value: true }
  })

  const welcomeEnabled = settings.find(s => s.key === 'welcome_message_enabled') 
    ? settings.find(s => s.key === 'welcome_message_enabled')?.value === 'true' 
    : true

  // @ts-ignore
  const showWelcome = welcomeEnabled && (dbUser ? !dbUser.hasSeenWelcome : true)

  const embyUrl = settings.find(s => s.key === 'emby_url')?.value
  const hasQbit = !!settings.find(s => s.key === 'qbittorrent_url' && s.value)
  const hasSmb = !!settings.find(s => s.key === 'smb_host' && s.value)
  const hasDownloads = hasQbit || hasSmb
  const hasDocker = !!settings.find(s => s.key === 'docker_host' && s.value) || !!settings.find(s => s.key === 'unraid_url' && s.value)

  if (!embyUrl) {
    // Only show the configuration warning for the default instance or if user is admin
    const isBaseAdmin = userRole === 'admin'
    
    if (isBaseAdmin || !embyUrl) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
          <div className="p-4 bg-yellow-500/10 rounded-full mb-4">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configuration incomplète</h2>
          <p className="text-gray-400 max-w-md mb-6">
            L'instance doit être configurée avec l'URL d'Emby pour afficher les données du tableau de bord.
          </p>
          {isBaseAdmin && (
            <Link 
              href="/dashboard/settings" 
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-900/20"
            >
              <Settings className="w-5 h-5" />
              <span>Aller aux paramètres</span>
            </Link>
          )}
        </div>
      )
    }
  }

  // Initialize results
  let sessions: any[] = []
  let recentRequests: any[] = []
  let recentlyWatched: any[] = []
  let recommendations: any[] = []
  let activeTorrents: any[] = []
  
  // Parallel fetching for performance
  const [sessionsRes, requestsRes, watchedRes, recsRes, torrentsRes] = await Promise.allSettled([
    embyService ? embyService.getSessions() : Promise.resolve([]),
    ability.can('read', 'MediaRequest') ? prisma.mediaRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 20
    }) : Promise.resolve([]),
    fetchRecentlyWatchedItems(),
    fetchUserRecommendations(),
    ability.can('read', 'Downloads') ? getTorrents('all') : Promise.resolve([])
  ])

  // Process sessions
  if (sessionsRes.status === 'fulfilled') {
    sessions = Array.isArray(sessionsRes.value) ? sessionsRes.value : []
  }

  // Process torrents
  if (torrentsRes.status === 'fulfilled') {
    activeTorrents = Array.isArray(torrentsRes.value) ? torrentsRes.value : []
  }

  // Process requests
  if (requestsRes.status === 'fulfilled') {
    const tmdbService = await getTmdbService()
    
    recentRequests = await Promise.all(requestsRes.value.map(async (req: any) => {
      let metadata: any = {}
      try {
        metadata = req.metadata ? JSON.parse(req.metadata) : {}
      } catch (e) {}

      let posterPath = metadata.posterPath
      
      // If posterPath is missing or looks like a local Sonarr/Radarr path, try to get from TMDB
      if ((!posterPath || posterPath.includes('MediaCover')) && req.tmdbId && tmdbService) {
        try {
           const tmdbIdNum = parseInt(req.tmdbId)
           if (!isNaN(tmdbIdNum)) {
             const details = await tmdbService.getDetails(tmdbIdNum, req.mediaType as 'movie' | 'tv')
             if (details && details.poster_path) {
               posterPath = details.poster_path
             }
           }
        } catch (e) {
           // ignore error
        }
      }

      return {
        id: req.id.toString(),
        type: req.mediaType,
        status: req.status,
        media: {
          title: req.title,
          posterPath: posterPath,
          tmdbId: req.tmdbId
        },
        requestedBy: {
          displayName: req.requesterName || 'Inconnu'
        }
      }
    }))
  }

  // Process watched & recommendations
  if (watchedRes.status === 'fulfilled') {
    recentlyWatched = watchedRes.value
  }
  if (recsRes.status === 'fulfilled') {
    recommendations = Array.isArray(recsRes.value) ? recsRes.value : (recsRes.value as any).results || []
  }

  return (
    <div className="w-full px-2 md:px-4 mx-auto min-h-screen flex flex-col space-y-6 pb-8">
      <WelcomePopup show={showWelcome} userRole={userRole} />
      {/* Barre de recherche et Actions Rapides (Largeur totale) */}
      <div className="flex-shrink-0">
        <QuickActions 
          initialTorrents={activeTorrents} 
          userName={user?.name || ''} 
          isAdmin={isAdminOrUserPlus}
          configStatus={{ hasDownloads, hasDocker }}
        />
      </div>
      
      {/* Zone de contenu scindée */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Colonne de Gauche : Médias */}
        <div className={`space-y-8 ${ability.can('read', 'MediaRequest') ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <ReleaseCalendar />
          <RecentlyWatched items={recentlyWatched} />
          <Recommendations items={recommendations} />
        </div>
        
        {/* Colonne de Droite : Dernières demandes (Fixe et défilante) */}
        {ability.can('read', 'MediaRequest') && (
          <div className="xl:sticky xl:top-8 h-[calc(100vh-160px)] overflow-hidden">
            <RecentRequests requests={recentRequests} />
          </div>
        )}
      </div>
    </div>
  )
}
