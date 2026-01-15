import { getEmbyServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from './media/actions'
import { RecentlyWatched } from './media/RecentlyWatched'
import { Recommendations } from './media/Recommendations'
import { RecentRequests } from './RecentRequests'
import { QuickActions } from './QuickActions'
import { getSetting } from '@/lib/settings'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { getTorrents } from './downloads/actions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WelcomePopup } from '@/components/WelcomePopup'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const userRole = user?.role || 'user'
  const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
  const instanceId = user?.instanceId ? parseInt(user.instanceId) : NaN
  const userId = user?.id ? parseInt(user.id) : NaN

  if (isNaN(instanceId) || isNaN(userId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
        <p className="text-gray-400">Impossible d'identifier votre session. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  const embyService = await getEmbyServiceForUser()

  // Check if user has seen welcome popup
  const dbUser = await (prisma as any).user.findFirst({
    where: { 
      id: userId,
      instanceId
    }
  })
  // @ts-ignore
  const showWelcome = dbUser ? !dbUser.hasSeenWelcome : true

  const embyUrl = await getSetting('emby_url', instanceId)

  if (!embyUrl) {
    // Only show the configuration warning for the default instance or if user is admin
    const isBaseAdmin = userRole === 'admin' && user?.isDefaultInstance
    
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
    (prisma as any).mediaRequest.findMany({
      where: { instanceId },
      orderBy: { requestedAt: 'desc' },
      take: 20
    }),
    fetchRecentlyWatchedItems(),
    fetchUserRecommendations(),
    getTorrents('all')
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
    recentRequests = requestsRes.value.map((req: any) => {
      let metadata = {}
      try {
        metadata = req.metadata ? JSON.parse(req.metadata) : {}
      } catch (e) {}
      return {
        id: req.id.toString(),
        type: req.mediaType,
        status: req.status,
        media: {
          title: req.title,
          posterPath: (metadata as any).posterPath
        },
        requestedBy: {
          displayName: req.requesterName || 'Inconnu'
        }
      }
    })
  }

  // Process watched & recommendations
  if (watchedRes.status === 'fulfilled') {
    recentlyWatched = watchedRes.value
  }
  if (recsRes.status === 'fulfilled') {
    recommendations = Array.isArray(recsRes.value) ? recsRes.value : (recsRes.value as any).results || []
  }

  return (
    <div className="max-w-7xl mx-auto w-full min-h-screen flex flex-col space-y-8 pb-8">
      <WelcomePopup show={showWelcome} userRole={userRole} />
      {/* Barre de recherche et Actions Rapides (Largeur totale) */}
      <div className="flex-shrink-0">
        <QuickActions 
          initialTorrents={activeTorrents} 
          userName={user?.name || ''} 
          isAdmin={isAdminOrUserPlus}
        />
      </div>
      
      {/* Zone de contenu scindée */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Colonne de Gauche : Médias (Prend toute sa hauteur, pas de scroll interne) */}
        <div className="xl:col-span-2 space-y-8">
          <RecentlyWatched items={recentlyWatched} />
          <Recommendations items={recommendations} />
        </div>
        
        {/* Colonne de Droite : Dernières demandes (Fixe et défilante) */}
        <div className="xl:sticky xl:top-8 h-[calc(100vh-160px)] overflow-hidden">
          <RecentRequests requests={recentRequests} />
        </div>
      </div>
    </div>
  )
}
