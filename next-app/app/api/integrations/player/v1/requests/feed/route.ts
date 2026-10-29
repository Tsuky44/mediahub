import { NextResponse } from 'next/server'
import { and, asc, gt } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { apiError, authenticate, serializeRequest } from '@/lib/integrations/player-v1'

export const dynamic = 'force-dynamic'

/**
 * Flux des nouvelles demandes de tous les comptes (sondage de secours quand
 * le webhook n'arrive pas). ?after=<curseur> ; le curseur rendu est le plus
 * grand id vu, a repasser tel quel.
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('read', 'MediaRequest')) return apiError(403, 'Forbidden')

  const params = new URL(request.url).searchParams
  const rawAfter = params.get('after')
  const after = rawAfter === null || rawAfter === '' ? 0 : Number(rawAfter)
  if (!Number.isInteger(after) || after < 0) return apiError(400, 'Curseur invalide')
  const limit = Math.min(200, Math.max(1, Number.parseInt(params.get('limit') || '', 10) || 100))

  const rows = await db.select().from(mediaRequests)
    .where(and(gt(mediaRequests.id, after)))
    .orderBy(asc(mediaRequests.id))
    .limit(limit)

  return NextResponse.json({
    cursor: rows.length ? rows[rows.length - 1].id : after,
    requests: rows.map((row) => serializeRequest(row, { withRequester: true })),
  })
}
