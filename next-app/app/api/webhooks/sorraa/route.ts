/**
 * Webhook sorraa : memes statuts et notifications que Radarr/Sonarr.
 * Evenements : grabbed, imported, upgraded, download_failed, import_failed,
 * request_changed, health_degraded, health_restored, test.
 * Authentification : signature HMAC-SHA256 (X-Sorraa-Signature), secret `webhook_sorraa_secret`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, like, ne } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { dispatch } from '@/lib/notifications-v2/dispatcher'
import { NOTIFICATION_EVENTS } from '@/lib/notifications-v2/types'
import { notifyOnyx } from '@/lib/integrations/onyx-webhook'
import { emitRequestStatus } from '@/lib/integrations/player-v1'
import { verifySorraaDelivery } from '@/lib/webhooks/verify-sorraa'
import { mergeRequests, stateToRequestStatus } from '@/lib/download-managers/sorraa'
import { getSorraaService, type SorraaRequestState } from '@/lib/services/sorraa'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface SorraaWebhookPayload {
  id: number
  event: string
  at: string
  message?: string
  quality?: string
  release?: string
  path?: string
  /** Chemin absolu du fichier (sorraa recent) ; sinon `path` est relatif au dossier racine */
  absolutePath?: string
  media?: { id: number; kind: 'movie' | 'series'; tmdbId: number; title: string }
  unit?: { id: number; kind: string; season?: number; episode?: number; title?: string }
  requests?: Array<{
    id: number
    state: SorraaRequestState
    seasons?: Array<{ number: number; state: SorraaRequestState }>
  }>
}

/** Met a jour media_requests depuis les etats de sorraa. */
async function syncRequestStatuses(payload: SorraaWebhookPayload, mediaType: 'movie' | 'tv', tmdbId: string) {
  if (!payload.requests?.length) return
  const merged = mergeRequests(payload.requests)
  // Un fichier qui disparait peut faire redescendre une demande (request_changed seulement)
  const canDowngrade = payload.event === 'request_changed'
  const changedIds: number[] = []

  const apply = async (state: SorraaRequestState, seasonNumber?: number) => {
    const newStatus = stateToRequestStatus(state)
    const where = and(
      eq(mediaRequests.tmdbId, tmdbId),
      eq(mediaRequests.mediaType, mediaType),
      ne(mediaRequests.status, newStatus),
      ne(mediaRequests.status, 6), // refusee
      ne(mediaRequests.status, 1), // pas encore envoyee a sorraa
      ...(seasonNumber !== undefined ? [like(mediaRequests.metadata, `%"seasons":[${seasonNumber}]%`)] : [])
    )
    const rows = await db.select({ id: mediaRequests.id, status: mediaRequests.status }).from(mediaRequests).where(where)
    // Hors request_changed, une demande deja plus avancee ne recule jamais
    const ids = rows.filter((r) => canDowngrade || r.status < newStatus).map((r) => r.id)
    for (const id of ids) {
      await db.update(mediaRequests).set({ status: newStatus, updatedAt: new Date() }).where(eq(mediaRequests.id, id))
      changedIds.push(id)
    }
  }

  if (mediaType === 'tv' && merged.seasons.size > 0) {
    for (const [seasonNumber, state] of merged.seasons) await apply(state, seasonNumber)
  } else {
    await apply(merged.state)
  }
  await emitRequestStatus(changedIds)
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const verdict = await verifySorraaDelivery(req.headers, rawBody)
    if (!verdict.ok) {
      logger.warn(`[SorraaWebhook] Livraison refusee : ${verdict.reason}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: SorraaWebhookPayload
    try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
    const { event, media } = payload
    logger.info(`[SorraaWebhook] Evenement ${event}`)

    if (event === 'test' || event.startsWith('health_') || !media?.tmdbId) {
      if (event.startsWith('health_')) logger.warn(`[SorraaWebhook] ${event}: ${payload.message ?? ''}`)
      return NextResponse.json({ success: true })
    }

    const mediaType: 'movie' | 'tv' = media.kind === 'series' ? 'tv' : 'movie'
    const tmdbId = String(media.tmdbId)
    const season = payload.unit?.season

    await syncRequestStatuses(payload, mediaType, tmdbId)

    if (event === 'imported' || event === 'upgraded') {
      let importedPath = payload.absolutePath || payload.path
      if (!payload.absolutePath && payload.path) {
        try {
          const sorraa = await getSorraaService()
          if (sorraa) importedPath = await sorraa.resolveAbsolutePath(media.id, payload.path)
        } catch (e) {
          logger.warn('[SorraaWebhook] Chemin absolu introuvable, chemin relatif transmis:', e)
        }
      }
      notifyOnyx('media.imported', { tmdbId: media.tmdbId, mediaType, paths: importedPath ? [importedPath] : [] })
      // MEDIA_AVAILABLE : laisse a l'AvailabilityPoller (dedup, saisons groupees, verification Emby)
      return NextResponse.json({ success: true })
    }

    const v2Event =
      event === 'grabbed' ? NOTIFICATION_EVENTS.MEDIA_GRABBED
      : event === 'download_failed' || event === 'import_failed' ? NOTIFICATION_EVENTS.MEDIA_FAILED
      : null
    if (!v2Event) return NextResponse.json({ success: true })

    const rows = await db.query.mediaRequests.findMany({
      where: and(
        eq(mediaRequests.tmdbId, tmdbId),
        eq(mediaRequests.mediaType, mediaType),
        ...(mediaType === 'tv' && season !== undefined ? [like(mediaRequests.metadata, `%"seasons":[${season}]%`)] : [])
      ),
      with: { user: true },
      limit: 1,
    })
    const user = rows[0]?.user as (Record<string, unknown> & { id: number }) | undefined
    const requester = user ? {
      id: user.id,
      name: (user.name as string | null) || undefined,
      email: (user.email as string | null) || undefined,
      whatsappNumber: user.whatsappNumber as string | undefined,
    } : undefined

    let posterPath: string | undefined
    let overview: string | undefined
    try {
      const { getTmdbService } = await import('@/lib/services/tmdb')
      const tmdbService = await getTmdbService()
      const info = tmdbService ? await tmdbService.getDetails(media.tmdbId, mediaType) : null
      posterPath = info?.poster_path || undefined
      overview = info?.overview || undefined
    } catch (e) {
      logger.warn('[SorraaWebhook] Echec de lecture TMDB:', e)
    }

    const result = await dispatch(v2Event, {
      correlationId: `sorraa-${event}-${payload.id}-${tmdbId}`,
      media: {
        tmdbId,
        mediaType,
        title: media.title,
        overview,
        posterPath,
        seasonNumber: mediaType === 'tv' ? season : undefined,
      },
      requester,
      download: event === 'grabbed' ? { quality: payload.quality, releaseName: payload.release } : undefined,
      failure: v2Event === NOTIFICATION_EVENTS.MEDIA_FAILED
        ? { reason: payload.message || 'Échec du téléchargement', stage: event === 'import_failed' ? 'import' : 'download' }
        : undefined,
    })
    if (!result.success && !result.wasDuplicate) logger.error(`[SorraaWebhook] Echec de dispatch: ${result.error}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[SorraaWebhook] Error:', (error as Error).message)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
