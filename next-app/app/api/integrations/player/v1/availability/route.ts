import { NextResponse } from 'next/server'
import { apiError, authenticate, parseId, parseMediaType, serializeAvailability } from '@/lib/integrations/player-v1'
import { getMediaAvailability } from '@/lib/services/media-status'

export const dynamic = 'force-dynamic'

const MAX_ITEMS = 100

/** Disponibilite de plusieurs titres d'un coup : { items: [{ tmdbId, mediaType }] }. */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('read', 'Media')) return apiError(403, 'Forbidden')

  const body = await request.json().catch(() => null) as { items?: Array<{ tmdbId?: unknown; mediaType?: unknown }> } | null
  if (!body || !Array.isArray(body.items) || body.items.length > MAX_ITEMS) return apiError(400, 'Invalid body')

  const results = await Promise.all(body.items.map(async (item) => {
    const tmdbId = parseId(String(item?.tmdbId))
    const mediaType = parseMediaType(item?.mediaType)
    if (!tmdbId || !mediaType) return null
    const availability = await getMediaAvailability(tmdbId, mediaType).catch(() => null)
    return {
      tmdbId,
      mediaType,
      ...(availability ? serializeAvailability(availability) : { status: 'unknown', available: false, awaitingRelease: false, waiting: null, expectedReleaseDate: null, seasons: [] }),
    }
  }))

  return NextResponse.json({ results: results.filter((item) => item !== null) })
}
