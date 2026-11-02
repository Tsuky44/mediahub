import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import {
  apiError,
  authenticate,
  availabilityOf,
  emitRequestStatus,
  parseId,
  REQUEST_DECLINED,
  serializeAvailability,
  serializeRequest,
} from '@/lib/integrations/player-v1'
import { notifyOnyx } from '@/lib/integrations/onyx-webhook'
import { getMediaAvailability } from '@/lib/services/media-status'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

async function loadAllowed(request: Request, context: Context) {
  const auth = await authenticate(request)
  if (!auth.ok) return { response: auth.response } as const
  const id = parseId((await context.params).id)
  if (!id) return { response: apiError(400, 'Invalid id') } as const
  const row = await db.query.mediaRequests.findFirst({ where: eq(mediaRequests.id, id) })
  if (!row) return { response: apiError(404, 'Request not found') } as const
  return { auth, row } as const
}

/** Detail d'une demande, avec la disponibilite du titre (saisons) et la raison d'attente. */
export async function GET(request: Request, context: Context) {
  const loaded = await loadAllowed(request, context)
  if ('response' in loaded) return loaded.response
  const { auth, row } = loaded

  const isOwner = auth.userId !== null && row.userId === auth.userId
  if (!isOwner && auth.ability.cannot('read', 'MediaRequest')) return apiError(403, 'Forbidden')
  if (isOwner && auth.ability.cannot('read', 'MediaRequest') && auth.ability.cannot('create', 'MediaRequest')) {
    return apiError(403, 'Forbidden')
  }

  const tmdbId = Number.parseInt(row.tmdbId, 10)
  const mediaType = row.mediaType === 'tv' ? 'tv' : 'movie'
  const availability = Number.isInteger(tmdbId)
    ? await getMediaAvailability(tmdbId, mediaType).catch(() => null)
    : null

  return NextResponse.json({
    ...serializeRequest(row, { availability: row.status < 4 ? availability ?? await availabilityOf(row) : null, withRequester: true }),
    availability: availability ? serializeAvailability(availability) : null,
  })
}

/**
 * Moderation : { action: "approve" } ou { action: "decline", reason? }.
 * Reserve a qui peut modifier les demandes (administrateur). Une demande
 * deja disponible ne peut plus etre refusee.
 */
export async function PATCH(request: Request, context: Context) {
  const loaded = await loadAllowed(request, context)
  if ('response' in loaded) return loaded.response
  const { auth, row } = loaded
  if (auth.ability.cannot('update', 'MediaRequest')) return apiError(403, 'Forbidden')

  const body = await request.json().catch(() => null) as { action?: unknown; reason?: unknown } | null
  const action = body?.action
  if (action !== 'approve' && action !== 'decline') return apiError(400, 'action must be approve or decline')
  if (row.status >= 4 && row.status !== REQUEST_DECLINED) return apiError(409, 'Request already processed', 'conflict')

  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  const status = action === 'approve' ? 2 : REQUEST_DECLINED
  if (row.status === status) return NextResponse.json(serializeRequest(row, { withRequester: true }))

  await db.update(mediaRequests)
    .set({
      status,
      notes: action === 'decline' ? reason || null : row.notes,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mediaRequests.id, row.id))
  await logAction(auth.userId, action === 'approve' ? 'MEDIA_REQUEST_APPROVE' : 'MEDIA_REQUEST_DECLINE', 'MediaRequest', String(row.id), { via: 'player-api', reason: reason || undefined })
  await emitRequestStatus([row.id], row.status)

  const updated = await db.query.mediaRequests.findFirst({ where: eq(mediaRequests.id, row.id) })
  return NextResponse.json(serializeRequest(updated ?? row, { withRequester: true }))
}

/** Supprime la demande dans MediaHub (Radarr/Sonarr ne sont pas touches). */
export async function DELETE(request: Request, context: Context) {
  const loaded = await loadAllowed(request, context)
  if ('response' in loaded) return loaded.response
  const { auth, row } = loaded
  if (auth.ability.cannot('delete', 'MediaRequest')) return apiError(403, 'Forbidden')

  const serialized = serializeRequest(row, { withRequester: true })
  await db.delete(mediaRequests).where(eq(mediaRequests.id, row.id))
  await logAction(auth.userId, 'MEDIA_REQUEST_DELETE', 'MediaRequest', String(row.id), { via: 'player-api', tmdbId: row.tmdbId })
  notifyOnyx('request.deleted', { request: serialized, requesterId: row.userId })

  return NextResponse.json({ success: true })
}
