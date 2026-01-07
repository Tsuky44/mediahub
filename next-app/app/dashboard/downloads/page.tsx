import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AlertCircle } from 'lucide-react'
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

  return <DownloadsClient />
}
