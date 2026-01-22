import { NextRequest, NextResponse } from 'next/server'
import { importJellyseerrRequests } from '@/lib/jellyseerr-import'
import { prisma } from '@/lib/prisma'
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
    // Synchroniser toutes les instances ayant Jellyseerr configuré
    const instances = await prisma.instance.findMany({
      where: {
        jellyseerrUrl: { not: null },
        jellyseerrApiKey: { not: null }
      }
    });

    for (const instance of instances) {
      console.log(`[Sync] Syncing Jellyseerr requests for instance: ${instance.name}`);
      await importJellyseerrRequests(prisma, instance.id);
    }

    revalidatePath('/dashboard/requests/list')
    return NextResponse.json({ 
      success: true,
      message: `Sync completed for ${instances.length} instances`
    })
  } catch (error: any) {
    console.error('[Sync] Jellyseerr sync failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Sync failed', 
      details: error.message 
    }, { status: 500 })
  }
}
