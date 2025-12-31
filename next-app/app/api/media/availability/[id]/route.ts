import { NextResponse } from 'next/server'
import { jellyseerrService } from '@/lib/services/jellyseerr'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'movie' | 'tv' || 'movie'
    const refresh = searchParams.get('refresh') === 'true'
    const { id } = await params
    const tmdbId = parseInt(id)

    if (isNaN(tmdbId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const availability = await jellyseerrService.getMediaAvailability(tmdbId, type, refresh)
    return NextResponse.json(availability)
  } catch (error) {
    console.error('Failed to check availability:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
