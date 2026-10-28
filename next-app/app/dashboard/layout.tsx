import { Navbar } from '@/components/global/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { SystemMessageDisplay } from '@/components/global/SystemMessageDisplay'
import { MotionDirector } from '@/components/global/MotionDirector'
import { IntentPrefetch } from '@/components/global/IntentPrefetch'
import { getDashboardConfig } from './_services/dashboard-config'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, config] = await Promise.all([getCurrentUser(), getDashboardConfig()])
  const isImpersonated = user?.isImpersonated
  const impersonatedRole = user?.role

  // Check enabled features based on configuration
  const configStatus = {
    hasDownloads: config.hasDownloads,
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
      <MotionDirector />
      <IntentPrefetch />
    </div>
  )
}
