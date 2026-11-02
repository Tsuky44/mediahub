import { NextResponse } from 'next/server'
import { apiError, authenticate, parseId, parseMediaType, serializeAvailability } from '@/lib/integrations/player-v1'
import { getMediaAvailability } from '@/lib/services/media-status'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('read', 'Media')) return apiError(403, 'Forbidden')

  const tmdbId = parseId((await params).id)
  const mediaType = parseMediaType(new URL(request.url).searchParams.get('type'))
  if (!tmdbId || !mediaType) return apiError(400, 'Invalid media')

  return NextResponse.json(serializeAvailability(await getMediaAvailability(tmdbId, mediaType)))
}
