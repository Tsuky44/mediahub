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

  // Get current instance settings
  const currentJellyseerrId = await getSetting('jellyseerr_user_id', instanceId)
  const currentQbitUrl = await getSetting('qbittorrent_url', instanceId)
  const currentQbitUser = await getSetting('qbittorrent_username', instanceId)
  const currentQbitPass = await getSetting('qbittorrent_password', instanceId)
  
  // Get current SMB settings
  const currentSmbHost = await getSetting('smb_host', instanceId)
  const currentSmbUser = await getSetting('smb_username', instanceId)
  const currentSmbPass = await getSetting('smb_password', instanceId)
  const currentSmbShare = await getSetting('smb_share', instanceId)
  const currentSmbPath = await getSetting('smb_path', instanceId)
  
  // Get current Radarr/Sonarr settings
  const currentRadarrUrl = await getSetting('radarr_url', instanceId)
  const currentRadarrKey = await getSetting('radarr_api_key', instanceId)
  const currentSonarrUrl = await getSetting('sonarr_url', instanceId)
  const currentSonarrKey = await getSetting('sonarr_api_key', instanceId)
  
  // Get current Jellystat settings
  const currentJellystatUrl = await getSetting('jellystat_url', instanceId)
  const currentJellystatKey = await getSetting('jellystat_api_key', instanceId)

  // Core Emby settings from Instance table
  const currentEmbyUrl = currentInstance?.embyUrl
  const currentEmbyKey = currentInstance?.embyApiKey
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
      </div>

      <UserManagement initialUsers={dbUsers} />

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Configuration des services</h3>
        <SettingsForm 
          users={jellyseerrUsers} 
          currentJellyseerrId={currentJellyseerrId || ''}
          currentQbitUrl={currentQbitUrl}
          currentQbitUser={currentQbitUser}
          currentQbitPass={currentQbitPass}
          currentSmbHost={currentSmbHost}
          currentSmbUser={currentSmbUser}
          currentSmbPass={currentSmbPass}
          currentSmbShare={currentSmbShare}
          currentSmbPath={currentSmbPath}
          currentRadarrUrl={currentRadarrUrl}
          currentRadarrKey={currentRadarrKey}
          currentSonarrUrl={currentSonarrUrl}
          currentSonarrKey={currentSonarrKey}
          currentJellystatUrl={currentJellystatUrl}
          currentJellystatKey={currentJellystatKey}
          currentEmbyUrl={currentEmbyUrl}
          currentEmbyKey={currentEmbyKey}
          currentJellyseerrUrl={currentInstance?.jellyseerrUrl || ''}
          currentJellyseerrKey={currentInstance?.jellyseerrApiKey || ''}
        />
      </div>
    </div>
  )
}
