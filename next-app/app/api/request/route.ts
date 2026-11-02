import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { authenticatePlayerIntegration } from '@/lib/integrations/player-integration-auth'
import { createMediaRequest, type CreateMediaRequestBody } from '@/lib/services/media-requests'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const user = (await getCurrentUser()) || (await authenticatePlayerIntegration(request))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as CreateMediaRequestBody
    if (!body.tmdbId || !body.mediaType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }
    const result = await createMediaRequest(user as Parameters<typeof createMediaRequest>[0], body)
    return NextResponse.json(result.body, { status: result.status })
  } catch (e) {
    logger.error('Request failed', e)
    return NextResponse.json({ error: (e as Error).message || 'Internal Server Error' }, { status: 500 })
  }
}
