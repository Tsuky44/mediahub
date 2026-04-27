import { getServerSession } from 'next-auth'
import { authOptions, getQBittorrentServiceForUser, getSmbServiceForUser, getProwlarrServiceForUser } from '@/lib/auth'
import { AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import DownloadsClient from './_components/DownloadsClient'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


export default async function DownloadsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const ability = defineAbilityFor(user)

  if (!ability.can('read', 'Downloads')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 p-8">
        <div className="p-6 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-xl shadow-red-500/10 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
          <AlertCircle size={64} className="animate-pulse" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
            Accès restreint
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Vous n'avez pas les permissions nécessaires pour accéder à la gestion des téléchargements.
          </p>
        </div>
        <Link 
          href="/dashboard" 
          className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
        >
          <span>Retour au tableau de bord</span>
          <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    )
  }

  // Check services
  log('Debug Services:', {
    hasQbt: typeof getQBittorrentServiceForUser,
    hasSmb: typeof getSmbServiceForUser,
    hasProwlarr: typeof getProwlarrServiceForUser
  })

  const qbtService = await getQBittorrentServiceForUser()
  const smbService = await getSmbServiceForUser()
  const prowlarrService = typeof getProwlarrServiceForUser === 'function' ? await getProwlarrServiceForUser() : null

  if (!qbtService && !smbService && !prowlarrService) {
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

  const permissions = {
    canReadTorrents: ability.can('read', 'Downloads'),
    canAddTorrent: ability.can('add_torrent', 'Downloads') || ability.can('manage', 'Downloads'),
    canManageTorrents: ability.can('manage_torrents', 'Downloads') || ability.can('manage', 'Downloads'),
    canReadExplorer: ability.can('read_explorer', 'Downloads') || ability.can('manage', 'Downloads'),
    canShareFiles: ability.can('share_files', 'Downloads') || ability.can('manage', 'Downloads'),
    canDeleteFiles: ability.can('delete_files', 'Downloads') || ability.can('manage', 'Downloads'),
    canInteractiveSearch: ability.can('interactive_search', 'Downloads') || ability.can('manage', 'Downloads')
  }

  return (
    <div className="w-full">
      <DownloadsClient 
        hasQbit={!!qbtService} 
        hasSmb={!!smbService} 
        hasProwlarr={!!prowlarrService} 
        permissions={permissions}
        isAdmin={user?.role === 'admin'}
      />
    </div>
  )
}
