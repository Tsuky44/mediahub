import { jellyseerrService } from '@/lib/services/jellyseerr'
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
          <p className="text-gray-400">Seul l'administrateur peut modifier les paramètres globaux.</p>
        </div>
      )
  }

  // Fetch users from DB for role management
  const dbUsers = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  })

  // Fetch users from Jellyseerr for sync setting
  const jellyseerrUsers = await jellyseerrService.getUsers()

  // Get current global settings
  const currentJellyseerrId = await getSetting('jellyseerr_user_id')
  const currentQbitUrl = await getSetting('qbittorrent_url')
  const currentQbitUser = await getSetting('qbittorrent_username')
  const currentQbitPass = await getSetting('qbittorrent_password')
  
  // Get current SMB settings
  const currentSmbHost = await getSetting('smb_host')
  const currentSmbUser = await getSetting('smb_username')
  const currentSmbPass = await getSetting('smb_password')
  const currentSmbShare = await getSetting('smb_share')
  const currentSmbPath = await getSetting('smb_path')
  
  // Get current Radarr/Sonarr settings
  const currentRadarrUrl = await getSetting('radarr_url')
  const currentRadarrKey = await getSetting('radarr_api_key')
  const currentSonarrUrl = await getSetting('sonarr_url')
  const currentSonarrKey = await getSetting('sonarr_api_key')
  
  // Get current Jellystat settings
  const currentJellystatUrl = await getSetting('jellystat_url')
  const currentJellystatKey = await getSetting('jellystat_api_key')

  // Get current Emby settings
  const currentEmbyUrl = await getSetting('emby_url')
  const currentEmbyKey = await getSetting('emby_api_key')
  
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
        />
      </div>
    </div>
  )
}
