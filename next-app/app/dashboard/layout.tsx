import { Navbar } from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SystemMessageDisplay } from '@/components/SystemMessageDisplay'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const isImpersonated = (user as any)?.isImpersonated
  const impersonatedRole = (user as any)?.role

  // Check enabled features based on configuration
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['qbittorrent_url', 'smb_host', 'docker_host', 'unraid_url']
      }
    },
    select: {
      key: true,
      value: true
    }
  })

  const hasQbit = !!settings.find(s => s.key === 'qbittorrent_url' && s.value)
  const hasSmb = !!settings.find(s => s.key === 'smb_host' && s.value)
  const hasDocker = !!settings.find(s => s.key === 'docker_host' && s.value)
  const hasUnraid = !!settings.find(s => s.key === 'unraid_url' && s.value)

  const configStatus = {
    hasDownloads: hasQbit || hasSmb,
    hasDocker: hasDocker || hasUnraid
  }

  return (
    <div className="min-h-screen text-gray-100">
      <Navbar 
        configStatus={configStatus} 
        impersonation={isImpersonated ? { role: impersonatedRole } : undefined}
      />
      <main className="mx-auto w-full px-2 py-8 sm:px-4 lg:px-6">
        {children}
      </main>
      <SystemMessageDisplay />
    </div>
  )
}
