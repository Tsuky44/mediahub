import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'

import { QuickActions } from './_components/QuickActions'
import { WelcomePopup } from './_components/WelcomePopup'
import { ReleaseCalendar } from '@/components/global/ReleaseCalendar'
import {
  RecentlyWatchedSection,
  RecommendationsSection,
  RecentRequestsSection,
  RecentlyWatchedSkeleton,
  RecommendationsSkeleton,
  RecentRequestsSkeleton,
} from './_components/DashboardSections'

import { getDashboardConfig } from './_services/dashboard-config'
import { loadShowWelcome } from './_services/fetch-dashboard-data'
import { getTorrents } from './downloads/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const ability = defineAbilityFor(user)

  if (!user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
        <p className="text-gray-400">Impossible d'identifier votre session. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  const userRole = user.role || 'user'
  const isAdminOrUserPlus = userRole === 'admin' || userRole === 'user_plus'
  const canReadRequests = ability.can('read', 'MediaRequest')

  // Données rapides (SQLite + cache mémoire qBittorrent) uniquement : les sections
  // dépendant d'Emby/TMDB sont streamées plus bas via <Suspense>.
  const [config, activeTorrents] = await Promise.all([
    getDashboardConfig(),
    ability.can('read', 'Downloads') ? getTorrents('all') : Promise.resolve([]),
  ])
  const showWelcome = await loadShowWelcome(parseInt(user.id), config.welcomeEnabled)

  if (!config.mediaServerUrl) {
    const isBaseAdmin = userRole === 'admin'
    if (isBaseAdmin) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
          <div className="p-4 bg-yellow-500/10 rounded-full mb-4">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configuration incomplète</h2>
          <p className="text-gray-400 max-w-md mb-6">
            L'instance doit être configurée avec l'URL d'Emby ou Jellyfin pour afficher les données du tableau de bord.
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
  }

  return (
    <div className="w-full px-2 md:px-4 mx-auto min-h-screen flex flex-col space-y-6 pb-8">
      <WelcomePopup show={showWelcome} userRole={userRole} />
      <div className="flex-shrink-0">
        <QuickActions
          initialTorrents={activeTorrents}
          userName={user?.name || ''}
          isAdmin={isAdminOrUserPlus}
          configStatus={{ hasDownloads: config.hasDownloads, hasDocker: config.hasDocker }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className={`space-y-8 ${canReadRequests ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <ReleaseCalendar />
          <Suspense fallback={<RecentlyWatchedSkeleton />}>
            <RecentlyWatchedSection />
          </Suspense>
          <Suspense fallback={<RecommendationsSkeleton />}>
            <RecommendationsSection />
          </Suspense>
        </div>

        {canReadRequests && (
          <div className="xl:sticky xl:top-8 h-[calc(100vh-160px)] overflow-hidden">
            <Suspense fallback={<RecentRequestsSkeleton />}>
              <RecentRequestsSection />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
