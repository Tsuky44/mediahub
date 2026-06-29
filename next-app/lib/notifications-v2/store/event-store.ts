/**
 * Event Store — persiste les events notification en DB avec dédup atomique.
 * Utilise INSERT OR IGNORE (SQLite) pour garantir 0 doublon au niveau SQL.
 */

import { db } from '@/lib/db/drizzle'
import { notificationEvents, mediaRequests } from '@/lib/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { NotificationEvent, NotificationEventPayload, MediaInfo, RequesterInfo } from '../types'
import { buildDedupKey } from './dedup-key'

export interface RecordResult {
  created: boolean
  eventId: number
  wasDuplicate: boolean
}

/**
 * Enregistre un event en DB avec dédup atomique.
 * @returns {created} true si nouvel insert, false si déjà existant (doublon).
 */
export async function recordEvent(
  event: NotificationEvent,
  payload: Omit<NotificationEventPayload, 'event' | 'timestamp' | 'correlationId'> &
    Partial<Pick<NotificationEventPayload, 'correlationId' | 'timestamp'>>,
  opts?: {
    /** Force un correlationId spécifique (sinon généré). */
    correlationId?: string
    /** Status initial ('pending' par défaut). */
    status?: 'pending' | 'dispatched'
  }
): Promise<RecordResult> {
  const correlationId = opts?.correlationId ?? generateCorrelationId()
  const timestamp = payload.timestamp ?? new Date().toISOString()
  const dedupKey = buildDedupKey(event, payload.media, payload.requester, payload.failure?.stage)

  // Construire le JSON payload complet
  const fullPayload: NotificationEventPayload = {
    event,
    timestamp,
    correlationId,
    media: payload.media,
    requester: payload.requester,
    download: payload.download,
    failure: payload.failure,
  }

  try {
    // INSERT OR IGNORE grâce à la contrainte UNIQUE sur dedup_key
    // Note: SQLite avec Drizzle — on utilise insert().onConflictDoNothing().run()
    const insertResult = db
      .insert(notificationEvents)
      .values({
        requestId: null,
        tmdbId: payload.media.tmdbId,
        mediaType: payload.media.mediaType,
        event,
        correlationId,
        payload: JSON.stringify(fullPayload),
        status: opts?.status ?? 'pending',
        dedupKey,
        createdAt: new Date(),
        dispatchedAt: opts?.status === 'dispatched' ? new Date() : null,
      })
      .onConflictDoNothing({ target: notificationEvents.dedupKey })
      .run()

    const created = insertResult.changes > 0

    // On re-query pour récupérer l'ID de l'événement (qu'il soit nouveau ou déjà existant)
    const existing = await db.query.notificationEvents.findFirst({
      where: eq(notificationEvents.dedupKey, dedupKey),
      columns: { id: true },
    })

    if (!existing) {
      throw new Error(`EventStore: Failed to retrieve event after insert for dedupKey=${dedupKey}`)
    }

    if (created) {
      logger.info(`[NotifV2][cid=${correlationId}] Event ${event} recorded in DB (id=${existing.id}, tmdbId=${payload.media.tmdbId})`)
    } else {
      logger.debug(`[NotifV2][cid=${correlationId}] Event ${event} was duplicate (existing id=${existing.id})`)
    }

    return {
      created,
      eventId: existing.id,
      wasDuplicate: !created,
    }
  } catch (err) {
    // Log structuré pour debugging
    logger.error(`[NotifV2][cid=${correlationId}] EventStore.record failed:`, err)
    throw err
  }
}

/**
 * Marque un event comme 'dispatched' (tous les destinataires traités).
 */
export async function markEventDispatched(eventId: number): Promise<void> {
  await db
    .update(notificationEvents)
    .set({
      status: 'dispatched',
      dispatchedAt: new Date(),
    })
    .where(eq(notificationEvents.id, eventId))
}

/**
 * Marque un event comme 'failed' (tous les retries épuisés).
 */
export async function markEventFailed(eventId: number): Promise<void> {
  await db
    .update(notificationEvents)
    .set({ status: 'failed' })
    .where(eq(notificationEvents.id, eventId))
}

/**
 * Récupère les events récents pour une request donnée (pour débogage/audit).
 */
export async function getEventsByRequest(
  requestId: number,
  limit = 10
): Promise<Array<{ id: number; event: NotificationEvent; status: string; createdAt: Date }>> {
  const rows = await db.query.notificationEvents.findMany({
    where: eq(notificationEvents.requestId, requestId),
    orderBy: desc(notificationEvents.createdAt),
    limit,
    columns: { id: true, event: true, status: true, createdAt: true },
  })
  return rows as Array<{ id: number; event: NotificationEvent; status: string; createdAt: Date }>
}

/**
 * Récupère le dernier event d'une request pour un type donné.
 * Utilisé par le polling pour savoir quel était le dernier état notifié.
 */
export async function getLastEventForRequest(
  requestId: number,
  event: NotificationEvent
): Promise<{ status: string; createdAt: Date } | null> {
  const row = await db.query.notificationEvents.findFirst({
    where: and(
      eq(notificationEvents.requestId, requestId),
      eq(notificationEvents.event, event)
    ),
    orderBy: desc(notificationEvents.createdAt),
    columns: { status: true, createdAt: true },
  })
  return row ?? null
}

/**
 * Vérifie si un event a déjà été enregistré (pour les seeds de démarrage).
 */
export async function hasEvent(
  event: NotificationEvent,
  media: MediaInfo,
  requester?: RequesterInfo,
  stage?: string
): Promise<boolean> {
  const dedupKey = buildDedupKey(event, media, requester, stage)
  const row = await db.query.notificationEvents.findFirst({
    where: eq(notificationEvents.dedupKey, dedupKey),
    columns: { id: true },
  })
  return !!row
}

/**
 * Seed les events existants au démarrage pour éviter de spam
 * les vieilles requests déjà traitées.
 *
 * IMPORTANT : Ne seed QUE MEDIA_AVAILABLE pour les médias déjà disponibles (status=5).
 * Les events de téléchargement (GRABBED, etc.) ne sont PAS seedés car ils doivent
 * pouvoir être re-envoyés par les webhooks Radarr/Sonarr.
 */
export async function seedExistingEvents(requestIds: number[]): Promise<void> {
  if (requestIds.length === 0) return

  // On seed uniquement MEDIA_AVAILABLE pour ne pas spammer au démarrage
  // Les autres events (GRABBED, DOWNLOADING, etc.) seront gérés par les webhooks
  const eventsToSeed: NotificationEvent[] = ['MEDIA_AVAILABLE']

  for (const requestId of requestIds) {
    const req = await db.query.mediaRequests.findFirst({
      where: eq(mediaRequests.id, requestId),
      with: { user: true },
    })
    if (!req) continue

    // Extraire seasonNumber pour les TV (la dedup-key l'inclut)
    let seasonNumber: number | undefined
    if (req.mediaType === 'tv' && req.metadata) {
      try {
        const meta = JSON.parse(req.metadata) as { seasons?: Array<number | { seasonNumber?: number }> }
        const first = meta.seasons?.[0]
        if (typeof first === 'number') seasonNumber = first
        else if (first && typeof first.seasonNumber === 'number') seasonNumber = first.seasonNumber
      } catch {}
    }

    const media: MediaInfo = {
      tmdbId: req.tmdbId,
      mediaType: req.mediaType as 'movie' | 'tv',
      title: req.title,
      seasonNumber,
    }

    // Seed avec requester si disponible (clé req:...)
    const requester = (req as any).user
      ? { id: (req as any).user.id, name: (req as any).user.name ?? undefined }
      : undefined

    for (const event of eventsToSeed) {
      try {
        await recordEvent(event, { media, requester }, { status: 'dispatched' })
      } catch {
        // Ignore les conflits (déjà seedé)
      }
    }
  }

  logger.info(`[NotifV2] Seeded ${requestIds.length} requests (MEDIA_AVAILABLE only) to prevent startup spam`)
}

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
