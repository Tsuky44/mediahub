import { Navbar } from '@/components/global/Navbar'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { SystemMessageDisplay } from '@/components/global/SystemMessageDisplay'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const isImpersonated = user?.isImpersonated
  const impersonatedRole = user?.role

  // Check enabled features based on configuration
  const settingsList = await db.query.settings.findMany({
    where: inArray(settings.key, ['qbittorrent_url', 'smb_host', 'docker_host', 'unraid_url']),
    columns: {
      key: true,
      value: true
    }
  })

  const hasQbit = !!settingsList.find(s => s.key === 'qbittorrent_url' && s.value)
  const hasSmb = !!settingsList.find(s => s.key === 'smb_host' && s.value)
  const hasDocker = !!settingsList.find(s => s.key === 'docker_host' && s.value)
  const hasUnraid = !!settingsList.find(s => s.key === 'unraid_url' && s.value)

  const configStatus = {
    hasDownloads: hasQbit || hasSmb,
    hasDocker: hasDocker || hasUnraid
  }

  return (
    <div className="min-h-screen text-gray-100">
      <Navbar 
        configStatus={configStatus} 
        impersonation={isImpersonated ? { role: impersonatedRole || 'user' } : undefined}
      />
      <main className="mx-auto w-full px-2 py-8 sm:px-4 lg:px-6">
        {children}
      </main>
      <SystemMessageDisplay />
    </div>
  )
}
