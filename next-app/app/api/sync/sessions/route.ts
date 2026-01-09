import { NextRequest, NextResponse } from 'next/server'
import { syncActiveSessions } from '@/lib/services/watch-sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Si c'est une requête cron (vérification via header par exemple)
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if ((session?.user as any)?.role !== 'admin' && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncActiveSessions()
  
  if (result.success) {
    return NextResponse.json({ 
      message: 'Active sessions sync completed', 
      processed: result.processed 
    })
  } else {
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: result.error 
    }, { status: 500 })
  }
}
