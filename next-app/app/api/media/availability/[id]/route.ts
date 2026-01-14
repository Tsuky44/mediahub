import { NextResponse } from 'next/server'
import { getMediaAvailability } from '@/lib/services/media-status'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const availability = await getMediaAvailability(tmdbId, type, refresh)
    return NextResponse.json(availability)
  } catch (error) {
    console.error('Availability check failed', error)
    return NextResponse.json({ status: 'unknown', available: false }, { status: 500 })
  }
}
