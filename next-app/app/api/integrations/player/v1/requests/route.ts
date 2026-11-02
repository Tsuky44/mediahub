import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { apiError, authenticate, availabilityOf, parseMediaType, serializeRequest } from '@/lib/integrations/player-v1'
import { notifyOnyx } from '@/lib/integrations/onyx-webhook'
import { createMediaRequest, type CreateMediaRequestBody } from '@/lib/services/media-requests'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * Liste des demandes, la plus recente d'abord.
 * ?scope=mine (defaut) | all, ?limit, ?before=<id> (page suivante), ?status=pending,...
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const scope = params.get('scope') === 'all' ? 'all' : 'mine'
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(params.get('limit') || '', 10) || DEFAULT_LIMIT))
  const before = Number.parseInt(params.get('before') || '', 10)

  if (scope === 'all') {
    if (auth.ability.cannot('read', 'MediaRequest')) return apiError(403, 'Forbidden')
  } else if (auth.ability.cannot('read', 'MediaRequest') && auth.ability.cannot('create', 'MediaRequest')) {
    return apiError(403, 'Forbidden')
  }

  if (scope === 'mine' && auth.userId === null) return NextResponse.json({ requests: [], nextBefore: null })

  const conditions = []
  if (scope === 'mine' && auth.userId !== null) conditions.push(eq(mediaRequests.userId, auth.userId))
  if (Number.isInteger(before) && before > 0) conditions.push(lt(mediaRequests.id, before))
  const mediaType = parseMediaType(params.get('type'))
  if (mediaType) conditions.push(eq(mediaRequests.mediaType, mediaType))

  const rows = await db.select().from(mediaRequests)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(mediaRequests.id))
    .limit(limit + 1)

  const page = rows.slice(0, limit)
  const requests = await Promise.all(page.map(async (row) =>
    serializeRequest(row, { availability: row.status < 4 ? await availabilityOf(row) : null, withRequester: scope === 'all' }),
  ))

  return NextResponse.json({
    requests,
    nextBefore: rows.length > limit ? page[page.length - 1].id : null,
  })
}

/** Cree une demande : { tmdbId, mediaType, title?, posterPath?, seasons? } (meme logique que POST /api/request). */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('create', 'MediaRequest')) return apiError(403, 'Forbidden')

  const body = await request.json().catch(() => null) as Partial<CreateMediaRequestBody> | null
  const tmdbId = Number(body?.tmdbId)
  const mediaType = parseMediaType(body?.mediaType)
  if (!body || !Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaType) return apiError(400, 'Missing parameters')

  const result = await createMediaRequest(auth.user, {
    tmdbId,
    mediaType,
    title: body.title,
    posterPath: body.posterPath,
    seasons: body.seasons,
  })

  if (result.status !== 200) {
    const message = (result.body as { error?: string } | null)?.error || 'Request failed'
    return apiError(result.status, message)
  }

  // Si rien de neuf n'a ete cree (saison deja demandee), on rend les lignes existantes.
  const rows = result.requestIds.length
    ? await db.select().from(mediaRequests).where(inArray(mediaRequests.id, result.requestIds))
    : await db.select().from(mediaRequests)
        .where(and(eq(mediaRequests.tmdbId, String(tmdbId)), eq(mediaRequests.mediaType, mediaType)))
        .orderBy(desc(mediaRequests.id))
        .limit(20)

  const serialized = rows.map((row) => serializeRequest(row, { withRequester: true }))
  for (const item of serialized.filter((row) => result.requestIds.includes(row.id))) {
    notifyOnyx('request.created', { request: item, requesterId: auth.userId })
  }

  return NextResponse.json({
    success: true,
    created: result.requestIds.length > 0,
    message: (result.body as { message?: string } | null)?.message ?? null,
    requests: serialized.map(({ requester: _requester, ...rest }) => rest),
  }, { status: result.requestIds.length > 0 ? 201 : 200 })
}
