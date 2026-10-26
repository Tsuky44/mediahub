import { NextRequest, NextResponse } from 'next/server'
import { importJellyseerrRequests } from '@/lib/jellyseerr-import'
import { db } from '@/lib/db/drizzle'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function GET(request: NextRequest) {
  const session = await getSession()
  
  // Si c'est une requÃªte cron (vÃ©rification via header par exemple)
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!session && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Synchroniser Jellyseerr (configuration globale)
    log(`[Sync] Syncing Jellyseerr requests...`);
    await importJellyseerrRequests(db);

    revalidatePath('/dashboard/requests/list')
    return NextResponse.json({ 
      success: true,
      message: `Sync completed`
    })
  } catch (error: any) {
    error('[Sync] Jellyseerr sync failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Sync failed', 
      details: error.message 
    }, { status: 500 })
  }
}
