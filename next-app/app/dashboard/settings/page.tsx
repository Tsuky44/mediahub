import { getJellyseerrServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SettingsForm from './SettingsForm'
import UserManagement from './UserManagement'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || (session.user as any).role !== 'admin') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
          <p className="text-gray-400">Seul l'administrateur peut modifier les paramètres.</p>
        </div>
      )
  }

  const instanceIdStr = (session.user as any).instanceId
  const instanceId = instanceIdStr ? parseInt(instanceIdStr) : NaN

  if (isNaN(instanceId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-white">Erreur d'instance</h2>
        <p className="text-gray-400">Impossible d'identifier votre instance. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  // Fetch users from DB for role management (instance filtered)
  const dbUsers = await (prisma as any).user.findMany({
    where: { instanceId },
    orderBy: { name: 'asc' }
  })

  // Fetch users from Jellyseerr for sync setting
  const jellyseerrService = await getJellyseerrServiceForUser()
  const jellyseerrUsers = jellyseerrService ? await jellyseerrService.getUsers() : []

  // Fetch current instance for core Emby config
  const currentInstance = await (prisma as any).instance.findUnique({
    where: { id: instanceId }
  })

  // Fetch all instances if user is in default instance
  let allInstances = []
  if (currentInstance?.isDefault) {
    allInstances = await (prisma as any).instance.findMany({
      orderBy: { name: 'asc' }
    })
  } else {
    allInstances = [currentInstance]
  }

  // Fetch settings for all instances if default
  const instancesWithSettings = await Promise.all(allInstances.map(async (inst: any) => {
    const instId = inst.id
    return {
      ...inst,
      settings: {
        jellyseerr_user_id: await getSetting('jellyseerr_user_id', instId),
        qbittorrent_url: await getSetting('qbittorrent_url', instId),
        qbittorrent_username: await getSetting('qbittorrent_username', instId),
        qbittorrent_password: await getSetting('qbittorrent_password', instId),
        smb_host: await getSetting('smb_host', instId),
        smb_username: await getSetting('smb_username', instId),
        smb_password: await getSetting('smb_password', instId),
        smb_share: await getSetting('smb_share', instId),
        smb_path: await getSetting('smb_path', instId),
        radarr_url: await getSetting('radarr_url', instId),
        radarr_api_key: await getSetting('radarr_api_key', instId),
        sonarr_url: await getSetting('sonarr_url', instId),
        sonarr_api_key: await getSetting('sonarr_api_key', instId),
        jellystat_url: await getSetting('jellystat_url', instId),
        jellystat_api_key: await getSetting('jellystat_api_key', instId),
        emby_url: inst.embyUrl,
        emby_api_key: inst.embyApiKey,
        plex_url: inst.plexUrl,
        plex_token: inst.plexToken,
        jellyfin_url: inst.jellyfinUrl,
        jellyfin_api_key: inst.jellyfinApiKey,
        jellyseerr_url: inst.jellyseerrUrl,
        jellyseerr_api_key: inst.jellyseerrApiKey,
        type: inst.type,
      }
    }
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
      </div>

      <UserManagement initialUsers={dbUsers} />

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Configuration des services</h3>
        <SettingsForm 
          instances={instancesWithSettings}
          currentInstanceId={instanceId}
          users={jellyseerrUsers} 
        />
      </div>
    </div>
  )
}
