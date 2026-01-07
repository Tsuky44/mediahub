'use server'

import { jellyseerrService } from '@/lib/services/jellyseerr'
import { tmdbService } from '@/lib/services/tmdb'
import { embyService } from '@/lib/services/emby'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncJellyseerrRequests } from '@/lib/services/request-sync'
import { revalidatePath } from 'next/cache'

export async function forceSyncRequests() {
    try {
        const result = await syncJellyseerrRequests() as any
        revalidatePath('/dashboard/requests/list')
        return { 
            success: true, 
            syncedCount: result.count || 0,
            processed: result.count || 0
        }
    } catch (error: any) {
        console.error('Failed to force sync:', error)
        return { success: false, error: error.message || 'Erreur lors de la synchronisation' }
    }
}

import { getSetting, setSetting } from '@/lib/settings'

export async function fetchUserRequests(page: number, pageSize: number = 20) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return { results: [], total: 0, totalPages: 0 }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    })
    
    if (!dbUser) return { results: [], total: 0, totalPages: 0 }

    // Check last sync time
    const lastSyncStr = await getSetting('last_requests_sync')
    const lastSync = lastSyncStr ? parseInt(lastSyncStr) : 0
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000

    if (now - lastSync > tenMinutes) {
        // Trigger sync in background (fire and forget pattern)
        // Note: In some serverless environments this might not finish, but for persistent server it works.
        // We catch errors to avoid blocking the read.
        syncJellyseerrRequests().then(async () => {
             await setSetting('last_requests_sync', Date.now().toString())
             revalidatePath('/dashboard/requests/list')
        }).catch((err: any) => console.error('Background sync failed:', err))
    }

    const skip = (page - 1) * pageSize
    
    // Tout le monde voit toutes les demandes
    const whereClause = {}
    
    console.log(`[FetchRequests] User role: ${dbUser.role}, fetching all requests`)
    
    // Read from local DB instead of Jellyseerr API
    const [requests, total] = await Promise.all([
        (prisma as any).mediaRequest.findMany({
            where: whereClause,
            orderBy: { requestedAt: 'desc' },
            skip,
            take: pageSize
        }),
        (prisma as any).mediaRequest.count({
            where: whereClause
        })
    ])

    // Map DB format to the format expected by the UI
    const enrichedRequests = requests.map((req: any) => {
        let metadata = {}
        try {
            metadata = req.metadata ? JSON.parse(req.metadata) : {}
        } catch (e) {}

        return {
            id: req.externalId || req.id.toString(),
            type: req.mediaType,
            status: req.status,
            createdAt: req.requestedAt,
            isOnEmby: req.isOnEmby,
            embyItemId: req.embyItemId,
            media: {
                tmdbId: req.tmdbId,
                title: req.title,
                ...metadata
            },
            requestedBy: {
                displayName: req.requesterName,
                email: req.requesterEmail
            }
        }
    })

    return {
        results: enrichedRequests,
        total: total,
        totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('Error fetching user requests:', error)
    return { results: [], total: 0, totalPages: 0 }
  }
}
