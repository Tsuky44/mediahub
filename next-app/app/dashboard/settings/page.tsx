import { prisma } from '@/lib/prisma'
import { getRealUser } from '@/lib/auth'
import SettingsTabs from './_components/SettingsTabs'
import { getSetting } from '@/lib/settings'
import { AbilityProvider } from '@/components/providers/AbilityProvider'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  try {
    const user = await getRealUser()
    
    if (!user) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <h2 className="text-2xl font-bold text-white">Non connecté</h2>
            <p className="text-gray-400">Veuillez vous connecter pour accéder à cette page.</p>
          </div>
        )
    }

    const userRole = (user as any).role
    
    const hasAccess = userRole === 'admin'

    if (!hasAccess) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
            <p className="text-gray-400">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </div>
        )
    }

    // Fetch users from DB for role management
    const dbUsers = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { roleRef: true }
    })

    // Fetch roles
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    })

    // Fetch user groups
    const userGroups = await prisma.userGroup.findMany({
      include: {
        role: true,
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Fetch account requests
    const accountRequests = await prisma.accountRequest.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Fetch all settings
    const settingsList = await prisma.setting.findMany({
      select: { key: true, value: true }
    })
    
    const settings = settingsList.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {})
    
    return (
      <AbilityProvider user={user}>
        <SettingsTabs 
            dbUsers={dbUsers}
            settings={settings}
            userRole={userRole}
            roles={roles}
            userGroups={userGroups}
            accountRequests={accountRequests}
        />
      </AbilityProvider>
    )
  } catch (error: any) {
    console.error('[SettingsPage] Error rendering settings page:', error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-8">
        <h2 className="text-2xl font-bold text-red-500">Erreur serveur</h2>
        <p className="text-gray-400 text-center max-w-lg">
          Une erreur est survenue lors du chargement des paramètres. 
          Veuillez consulter les logs du serveur pour plus de détails.
        </p>
        <div className="bg-black/30 p-4 rounded-lg text-sm font-mono text-gray-300 w-full overflow-auto max-h-60">
          {error.message || JSON.stringify(error)}
        </div>
      </div>
    )
  }
}
