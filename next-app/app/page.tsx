import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAppConfigured } from '@/lib/setup'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const configured = await isAppConfigured()
  if (!configured) {
    redirect('/setup')
  }

  const session = await getSession()
  
  if (session) {
      redirect('/dashboard')
  } else {
      redirect('/login')
  }
}
