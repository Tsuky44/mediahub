import { NextRequest, NextResponse } from 'next/server'
import { getJellyseerrServiceForUser, getCurrentUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { syncJellyseerrRequests } from '@/lib/services/request-sync'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jellyseerrService = await getJellyseerrServiceForUser()
  if (!jellyseerrService) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const instanceId = parseInt((user as any).instanceId)

  try {
    const body = await request.json()
    const { tmdbId, mediaType, title, posterPath } = body

    if (!tmdbId || !mediaType) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Auto-detect Jellyseerr User
    let jellyseerrUserId: string | undefined = undefined
    try {
        const jsUser = await jellyseerrService.findUserByEmailOrName(user.email || undefined, user.name || undefined)
        if (jsUser) {
            jellyseerrUserId = String(jsUser.id)
            console.log(`[Jellyseerr] Auto-mapped user ${user.name} to JS ID ${jellyseerrUserId}`)
        }
    } catch (e) {
        console.warn('[Jellyseerr] Auto-mapping failed, falling back to global default')
    }

    // Fallback to instance setting if auto-detect failed
    if (!jellyseerrUserId) {
        jellyseerrUserId = await getSetting('jellyseerr_user_id', instanceId)
    }

    const result = await jellyseerrService.requestMedia(tmdbId, mediaType, title, jellyseerrUserId || undefined)
    
    if (result.success) {
        // Immediate Local DB Update
        try {
            const requestData = result.data
            const externalId = requestData?.id?.toString()
            const requestStatus = requestData?.status || 2 
            
            // Get user info
            const dbUser = await (prisma as any).user.findFirst({ 
                where: { email: user.email || '', instanceId } 
            })
            
            // Determine if we need to update or create
            let existingRequest = null
            if (externalId) {
                existingRequest = await (prisma as any).mediaRequest.findFirst({
                    where: { externalId: externalId, instanceId }
                })
            }
            
            // If not found by externalId, try tmdbId
            if (!existingRequest) {
                 existingRequest = await (prisma as any).mediaRequest.findFirst({
                    where: { tmdbId: tmdbId.toString(), instanceId }
                 })
            }

            if (existingRequest) {
                await (prisma as any).mediaRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: requestStatus,
                        updatedAt: new Date(),
                        externalId: externalId || existingRequest.externalId
                    }
                })
            } else {
                await (prisma as any).mediaRequest.create({
                    data: {
                        instanceId,
                        externalId: externalId || `pending_${tmdbId}_${Date.now()}`,
                        tmdbId: tmdbId.toString(),
                        mediaType: mediaType,
                        title: title || 'Sans titre',
                        status: requestStatus,
                        userId: dbUser?.id,
                        requesterName: user.name || dbUser?.name,
                        requesterEmail: user.email,
                        metadata: JSON.stringify({
                            posterPath: posterPath
                        }),
                        requestedAt: new Date()
                    }
                })
            }

            console.log(`[Request API] Immediate local DB update success for ${title}`)
        } catch (dbError) {
            console.error('[Request API] Failed to update local DB immediately:', dbError)
            // Non-blocking error, we continue
        }

        // Invalidate cache
        forget(`jellyseerr_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbId}`)
        revalidatePath('/dashboard/requests/list') // Refresh list immediately

        // Lancer la synchronisation en arrière-plan pour récupérer toutes les infos complètes
        setTimeout(() => {
            // Forcer le recheck de la disponibilité après 2 secondes
            forget(`jellyseerr_availability_${mediaType}_${tmdbId}`)
            syncJellyseerrRequests().then(() => {
                revalidatePath('/dashboard/requests/list')
            }).catch(err => console.error('[Sync] Background sync failed after request:', err))
        }, 2000)

        return NextResponse.json(result)
    } else {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

  } catch (e) {
    console.error('Request failed', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
