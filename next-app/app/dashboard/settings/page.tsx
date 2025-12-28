import { jellyseerrService } from '@/lib/services/jellyseerr'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SettingsForm from './SettingsForm'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || session.user.name !== 'mathis') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
          <p className="text-gray-400">Seul l'administrateur (mathis) peut modifier les paramètres globaux.</p>
        </div>
      )
  }

  // Fetch users from Jellyseerr
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
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-white">Paramètres</h2>
      
      <div className="bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white">Configuration Globale</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-400">
            <p>Gérez les connexions aux services externes pour tous les utilisateurs.</p>
          </div>
          <div className="mt-5">
             <SettingsForm 
                users={jellyseerrUsers} 
                currentJellyseerrId={currentJellyseerrId} 
                currentQbitUrl={currentQbitUrl}
                currentQbitUser={currentQbitUser}
                currentQbitPass={currentQbitPass}
                currentSmbHost={currentSmbHost}
                currentSmbUser={currentSmbUser}
                currentSmbPass={currentSmbPass}
                currentSmbShare={currentSmbShare}
                currentSmbPath={currentSmbPath}
             />
          </div>
        </div>
      </div>
    </div>
  )
}
