import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'

import { RecentlyWatched } from './media/RecentlyWatched'
import { Recommendations } from './media/Recommendations'
import { RecentRequests } from './_components/RecentRequests'
import { QuickActions } from './_components/QuickActions'
import { WelcomePopup } from './_components/WelcomePopup'
import { ReleaseCalendar } from '@/components/global/ReleaseCalendar'

import { fetchDashboardData } from './_services/fetch-dashboard-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const ability = defineAbilityFor(user)

  if (!user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
        <p className="text-gray-400">Impossible d'identifier votre session. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  const data = await fetchDashboardData(user, ability)

  if (!data.mediaServerUrl) {
    const isBaseAdmin = data.userRole === 'admin'
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
      <WelcomePopup show={data.showWelcome} userRole={data.userRole} />
      <div className="flex-shrink-0">
        <QuickActions
          initialTorrents={data.activeTorrents}
          userName={user?.name || ''}
          isAdmin={data.isAdminOrUserPlus}
          configStatus={{ hasDownloads: data.hasDownloads, hasDocker: data.hasDocker }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className={`space-y-8 ${ability.can('read', 'MediaRequest') ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <ReleaseCalendar />
          <RecentlyWatched items={data.recentlyWatched} />
          <Recommendations items={data.recommendations} />
        </div>

        {ability.can('read', 'MediaRequest') && (
          <div className="xl:sticky xl:top-8 h-[calc(100vh-160px)] overflow-hidden">
            <RecentRequests requests={data.recentRequests} />
          </div>
        )}
      </div>
    </div>
  )
}
