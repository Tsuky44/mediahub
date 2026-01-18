import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SettingsTabs from './SettingsTabs'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold text-white">Non connecté</h2>
          <p className="text-gray-400">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      )
  }

  const userRole = (session.user as any).role
  const userPermissions = (session.user as any).permissions || []
  
  const hasAccess = userRole === 'admin' || 
                    userPermissions.includes('settings.view') || 
                    userPermissions.includes('users.view') ||
                    userPermissions.includes('settings.manage')

  if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
          <p className="text-gray-400">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
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

  // Fetch current instance for core Emby config
  const currentInstance = await (prisma as any).instance.findUnique({
    where: { id: instanceId }
  })

  // Fetch all instances for the dropdown
  const allInstances = await (prisma as any).instance.findMany({
    include: {
        settings: true
    }
  })

  const instancesWithSettings = allInstances.map((inst: any) => ({
    id: inst.id,
    name: inst.name,
    slug: inst.slug,
    settings: {
      ...(inst.settings?.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {}) || {}),
      // Add core fields to settings object for form compatibility
      ...{
        emby_url: inst.embyUrl,
        emby_api_key: inst.embyApiKey,
        plex_url: inst.plexUrl,
        plex_token: inst.plexToken,
        jellyfin_url: inst.jellyfinUrl,
        jellyfin_api_key: inst.jellyfinApiKey,
        type: inst.type,
      }
    }
  }))

  return (
    <SettingsTabs 
        dbUsers={dbUsers}
        instancesWithSettings={instancesWithSettings}
        currentInstanceId={instanceId}
        userRole={userRole}
        userPermissions={userPermissions}
    />
  )
}
