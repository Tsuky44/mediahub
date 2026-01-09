import { getServerSession } from 'next-auth'
import { authOptions, getQBittorrentServiceForUser, getSmbServiceForUser } from '@/lib/auth'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import DownloadsClient from './DownloadsClient'

export default async function DownloadsPage() {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as any)?.role || 'user'

  if (userRole !== 'admin' && userRole !== 'user_plus') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
        <p className="text-gray-400">Vous n'avez pas les permissions nécessaires pour accéder à la gestion des fichiers.</p>
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Retour au tableau de bord
        </Link>
      </div>
    )
  }

  // Check services
  const qbtService = await getQBittorrentServiceForUser()
  const smbService = await getSmbServiceForUser()

  if (!qbtService && !smbService) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Services non configurés</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            La gestion des téléchargements nécessite que qBittorrent ou le SMB soit configuré. 
            Veuillez vérifier les paramètres de votre instance.
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

  return <DownloadsClient />
}
