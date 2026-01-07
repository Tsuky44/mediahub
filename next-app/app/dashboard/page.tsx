import { embyService } from '@/lib/services/emby'
import { prisma } from '@/lib/prisma'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from './media/actions'
import { RecentlyWatched } from './media/RecentlyWatched'
import { Recommendations } from './media/Recommendations'
import { RecentRequests } from './RecentRequests'
import { QuickActions } from './QuickActions'
import { getCurrentUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { getTorrents } from './downloads/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const embyUrl = await getSetting('emby_url')
  const jellystatUrl = await getSetting('jellystat_url')

  if (!embyUrl || !jellystatUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        <div className="p-4 bg-yellow-500/10 rounded-full mb-4">
          <AlertCircle className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Configuration incomplète</h2>
        <p className="text-gray-400 max-w-md mb-6">
          Vous devez configurer les URLs d'Emby et Jellystat pour afficher les données du tableau de bord.
        </p>
        <Link 
          href="/dashboard/settings" 
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-900/20"
        >
          <Settings className="w-5 h-5" />
          <span>Aller aux paramètres</span>
        </Link>
      </div>
    )
  }

  // Initialize results
  let sessions: any[] = []
  let recentRequests: any[] = []
  let recentlyWatched: any[] = []
  let recommendations: any[] = []
  let activeTorrents: any[] = []
  
  // Parallel fetching for performance
  const [sessionsRes, requestsRes, watchedRes, recsRes, torrentsRes] = await Promise.allSettled([
    embyService.getSessions(),
    prisma.mediaRequest.findMany({
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
    <div className="space-y-12 pb-20">
      {/* Barre de recherche centrale et Widgets d'état */}
      <section>
        <QuickActions initialTorrents={activeTorrents} userName={user?.name || user?.email?.split('@')[0]} />
      </section>

      {/* Activité en direct & Dernières Demandes */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {recommendations.length > 0 && (
            <div className="bg-gray-900/40 border border-gray-700/50 rounded-3xl p-6 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
              <Recommendations items={recommendations} />
            </div>
          )}
          {recentlyWatched.length > 0 && (
            <div className="bg-gray-900/40 border border-gray-700/50 rounded-3xl p-6 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
              <RecentlyWatched items={recentlyWatched} />
            </div>
          )}
        </div>
        <div className="lg:col-span-1 relative">
          <div className="lg:absolute lg:inset-0">
            <div className="bg-gray-900/40 border border-gray-700/50 rounded-3xl p-6 backdrop-blur-md shadow-2xl h-full ring-1 ring-white/5">
              <RecentRequests requests={recentRequests} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
