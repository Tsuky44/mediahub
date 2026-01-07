import { NextRequest, NextResponse } from 'next/server'
import { syncMediaNotifications } from '@/lib/services/notification-sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Optionnel: On peut limiter l'accès aux admins ou via un token secret
  // Pour l'instant, on permet l'exécution si l'utilisateur est connecté et est mathis (admin)
  const session = await getServerSession(authOptions)
  
  // Si c'est une requête cron (vérification via header par exemple)
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if ((session?.user as any)?.role !== 'admin' && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncMediaNotifications()
  
  if (result.success) {
    return NextResponse.json({ 
      message: 'Sync completed', 
      processed: result.processed 
    })
  } else {
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: result.error 
    }, { status: 500 })
  }
}
