import { NextRequest, NextResponse } from 'next/server'
import { syncJellyseerrRequests } from '@/lib/services/request-sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Si c'est une requête cron (vérification via header par exemple)
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!session && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await syncJellyseerrRequests()
    revalidatePath('/dashboard/requests/list')
    return NextResponse.json({ 
      success: true,
      message: 'Sync completed'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Sync failed', 
      details: error.message 
    }, { status: 500 })
  }
}
