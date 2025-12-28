import { NextResponse } from 'next/server'
import { jellyseerrService } from '@/lib/services/jellyseerr'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get('type') as 'movie' | 'tv'

  if (!mediaType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 })
  }

  try {
    const tmdbId = parseInt(id)
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

  // Only allow admins to delete media (assuming we have a way to check, 
  // for now we'll allow it if they are logged in, but in a real app check role)

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'media' or 'request'
  const targetId = searchParams.get('targetId')

  if (!action || !targetId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const id = parseInt(targetId)
    let result
    if (action === 'media') {
      result = await jellyseerrService.deleteMedia(id)
    } else if (action === 'request') {
      result = await jellyseerrService.deleteRequest(id)
    }

    if (result?.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Action failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API Manage] Delete Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
