import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import SettingsTabs from './_components/SettingsTabs'
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

    // Lectures SQLite indépendantes (users/rôles, groupes, demandes de compte, settings)
    const [dbUsers, rolesList, userGroupsList, accountRequestsList, settingsList] = await Promise.all([
      db.query.users.findMany({
        orderBy: sql`name ASC`,
        with: { roleRef: true }
      }),
      db.query.roles.findMany({
        orderBy: sql`name ASC`
      }),
      db.query.userGroups.findMany({
        with: {
          role: true,
          members: {
            with: {
              user: true
            }
          }
        },
        orderBy: sql`created_at DESC`
      }),
      db.query.accountRequests.findMany({
        orderBy: sql`created_at DESC`
      }),
      db.select({ key: settings.key, value: settings.value }).from(settings),
    ])
    const settingsMap = Object.fromEntries(settingsList.map((s) => [s.key, s.value]))

    return (
      <AbilityProvider user={user}>
        <SettingsTabs 
            dbUsers={dbUsers}
            settings={settingsMap}
            userRole={userRole}
            roles={rolesList}
            userGroups={userGroupsList}
            accountRequests={accountRequestsList}
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
