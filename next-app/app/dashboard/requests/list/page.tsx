import { fetchUserRequests } from './actions'
import { InfiniteRequestList } from './InfiniteRequestList'
import { getJellyseerrServiceForUser } from '@/lib/auth'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RequestsListPage() {
  // Check if Jellyseerr is configured
  const jellyseerrService = await getJellyseerrServiceForUser()
  
  if (!jellyseerrService) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Jellyseerr non configuré</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Cette fonctionnalité nécessite une connexion à Jellyseerr pour afficher vos demandes. 
            Veuillez configurer l'URL et la clé API dans les paramètres.
          </p>
        </div>
        <Link 
          href="/dashboard/settings" 
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
        >
          <Settings className="w-5 h-5" />
          Aller aux paramètres
        </Link>
      </div>
    )
  }

  const initialData = await fetchUserRequests(1, 20)

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Mes demandes</h2>
            <p className="text-gray-400 mt-1">Suivez l'état de vos demandes de médias</p>
        </div>
      </div>

      <InfiniteRequestList initialData={initialData} />
    </div>
  )
}
