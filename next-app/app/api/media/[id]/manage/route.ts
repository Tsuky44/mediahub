import { NextResponse } from 'next/server'
import { jellyseerrService } from '@/lib/services/jellyseerr'
import { getCurrentUser } from '@/lib/auth'

import { forget } from '@/lib/cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'media' or 'request'
  const targetId = searchParams.get('targetId')
  const mediaType = searchParams.get('type') as 'movie' | 'tv'

  if (!action || !targetId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const id = parseInt(targetId)
    const tmdbId = parseInt(tmdbIdStr)
    
    let result
    if (action === 'media') {
      result = await jellyseerrService.deleteMedia(id)
    } else if (action === 'request') {
      result = await jellyseerrService.deleteRequest(id)
    }

    if (result?.success) {
      // Invalidate the availability cache for this media
      if (mediaType && !isNaN(tmdbId)) {
        const cacheKey = `jellyseerr_availability_${mediaType}_${tmdbId}`
        console.log(`[API Manage] Invalidating cache for: ${cacheKey}`)
        forget(cacheKey)
      }
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Action failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API Manage] Delete Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
