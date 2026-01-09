import { NextResponse } from 'next/server'
import { getJellyseerrServiceForUser, getRadarrServiceForUser, getSonarrServiceForUser, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { syncJellyseerrRequests } from '@/lib/services/request-sync'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jellyseerrService = await getJellyseerrServiceForUser()
  if (!jellyseerrService) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const targetId = searchParams.get('targetId')
  const mediaType = searchParams.get('type') as 'movie' | 'tv'

  if (action === 'status' && targetId) {
    const id = parseInt(targetId)
    const result = await jellyseerrService.updateMediaStatus(id, 'available')
    
    if (result.success) {
      const tmdbId = parseInt(tmdbIdStr)
      if (mediaType && !isNaN(tmdbId)) {
        forget(`jellyseerr_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbIdStr}`)
      }
      return NextResponse.json({ success: true })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jellyseerrService = await getJellyseerrServiceForUser()
  if (!jellyseerrService) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get('type') as 'movie' | 'tv'

  if (!mediaType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 })
  }

  try {
    const tmdbId = parseInt(tmdbIdStr)
    const media = await jellyseerrService.getMedia(tmdbId, mediaType)
    
    if (!media) {
      return NextResponse.json({ error: 'Media not found in Jellyseerr' }, { status: 404 })
    }

    return NextResponse.json(media)
  } catch (error) {
    console.error('[API Manage] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch media info' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jellyseerrService = await getJellyseerrServiceForUser()
  const radarrService = await getRadarrServiceForUser()
  const sonarrService = await getSonarrServiceForUser()

  if (!jellyseerrService) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const instanceId = parseInt((user as any).instanceId)
  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'media' or 'request'
  const targetId = searchParams.get('targetId')
  const mediaType = searchParams.get('type') as 'movie' | 'tv'
  const deleteFiles = searchParams.get('deleteFiles') === 'true'

  if (!action || !targetId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const id = parseInt(targetId)
    const tmdbId = parseInt(tmdbIdStr)
    
    let result: { success: boolean; message?: string };
    
    if (action === 'media') {
      // First, if deleteFiles is true, try direct Radarr/Sonarr deletion
      if (deleteFiles) {
        // We need the external service ID from Jellyseerr
        const media = await jellyseerrService.getMedia(tmdbId, mediaType)
        const externalServiceId = media?.mediaInfo?.externalServiceId
        
        if (externalServiceId) {
          console.log(`[API Manage] Attempting direct deletion from ${mediaType === 'movie' ? 'Radarr' : 'Sonarr'} (ID: ${externalServiceId})`)
          if (mediaType === 'movie' && radarrService) {
            const directResult = await radarrService.deleteMovie(externalServiceId, true)
            if (!directResult.success) {
              console.warn(`[API Manage] Direct Radarr deletion failed: ${directResult.message}. Falling back to Jellyseerr.`)
            }
          } else if (mediaType === 'tv' && sonarrService) {
            const directResult = await sonarrService.deleteSeries(externalServiceId, true)
            if (!directResult.success) {
              console.warn(`[API Manage] Direct Sonarr deletion failed: ${directResult.message}. Falling back to Jellyseerr.`)
            }
          }
        } else {
          console.warn(`[API Manage] No external service ID found for direct deletion.`)
        }
      }

      // Then always delete from Jellyseerr to clean up their DB
      result = await jellyseerrService.deleteMedia(id, deleteFiles)
      
      if (result?.success) {
        // Delete any local requests for this media since the media itself is gone
        await prisma.mediaRequest.deleteMany({
          where: { tmdbId: tmdbIdStr, instanceId }
        })
      }
    } else if (action === 'request') {
      result = await jellyseerrService.deleteRequest(id)
      if (result?.success) {
        // Delete the local request
        await prisma.mediaRequest.deleteMany({
          where: { externalId: targetId, instanceId }
        })
      }
    } else if (action === 'status') {
      result = await jellyseerrService.updateMediaStatus(id, 'available')
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }


    if (result?.success) {
      // Invalidate the availability cache for this media
      if (mediaType && !isNaN(tmdbId)) {
        const cacheKey = `jellyseerr_availability_${mediaType}_${tmdbId}`
        console.log(`[API Manage] Invalidating cache for: ${cacheKey}`)
        forget(cacheKey)
        
        // Trigger Next.js revalidation for the media page AND the requests list immediately
        revalidatePath(`/dashboard/media/${tmdbIdStr}`)
        revalidatePath('/dashboard/requests/list')

        // Petit délai pour laisser le temps à Jellyseerr de mettre à jour son état
        // Et forcer un second recheck après 2 secondes pour être sûr
        setTimeout(() => {
          forget(cacheKey)
          syncJellyseerrRequests().then(() => {
            revalidatePath('/dashboard/requests/list')
          }).catch(err => console.error('[Sync] Background sync failed after deletion:', err))
        }, 2000)
      }
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ 
        error: result?.message || 'Action failed',
        details: result
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[API Manage] Delete Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
