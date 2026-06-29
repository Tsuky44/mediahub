/**
 * Delivery Store — persiste les envois à faire (outbox pattern).
 * Gère le retry avec backoff exponentiel et l'état de chaque livraison.
 */

import { db, sqlite } from '@/lib/db/drizzle'
import { notificationDeliveries, notificationEvents } from '@/lib/db/schema'
import { eq, lte, and, sql, inArray, desc } from 'drizzle-orm'

export interface EnqueueParams {
  eventId: number
  recipient: string
  provider?: string
}

export interface ClaimResult {
  id: number
  eventId: number
  recipient: string
  provider: string
  attempts: number
  payload: string // JSON from notificationEvents
}

/**
 * Enqueue une livraison à effectuer (crée un row pending).
 */
export async function enqueueDelivery(params: EnqueueParams): Promise<number> {
  const result = await db
    .insert(notificationDeliveries)
    .values({
      eventId: params.eventId,
      recipient: params.recipient,
      provider: params.provider ?? 'evolution',
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      nextRetryAt: new Date(), // immédiatement disponible
    })
    .returning({ id: notificationDeliveries.id })

  return result[0].id
}

/**
 * Enqueue multiple deliveries en batch.
 */
export async function enqueueDeliveries(paramsList: EnqueueParams[]): Promise<number[]> {
  if (paramsList.length === 0) return []

  const values = paramsList.map((p) => ({
    eventId: p.eventId,
    recipient: p.recipient,
    provider: p.provider ?? 'evolution',
    status: 'pending' as const,
    attempts: 0,
    createdAt: new Date(),
    nextRetryAt: new Date(),
  }))

  const result = await db
    .insert(notificationDeliveries)
    .values(values)
    .onConflictDoNothing({
      target: [
        notificationDeliveries.eventId,
        notificationDeliveries.recipient,
        notificationDeliveries.provider,
      ],
    })
    .returning({
      id: notificationDeliveries.id,
    })

  return result.map((r) => r.id).filter((id): id is number => id != null)
}

/**
 * Claim les deliveries pending qui sont prêtes à être envoyées.
 * Atomique via transaction: SELECT + UPDATE en un bloc isolé.
 * Le statut passe temporairement à 'processing' pour éviter les double-claim
 * si plusieurs workers tournent (même process ou hot-reload).
 */
export async function claimDueDeliveries(limit = 10): Promise<ClaimResult[]> {
  const now = new Date()
  const nowMs = now.getTime()

  const claim = sqlite.transaction(() => {
    // Step 1: SELECT des rows à traiter
    const pending = db
      .select()
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.status, 'pending'),
          lte(notificationDeliveries.nextRetryAt, now)
        )
      )
      .orderBy(notificationDeliveries.nextRetryAt)
      .limit(limit)
      .all()

    if (pending.length === 0) return []

    // Step 2: Lock atomique — passe à 'processing' + incrémente attempts
    const ids = pending.map((d) => d.id)
    db.update(notificationDeliveries)
      .set({
        status: 'processing',
        attempts: sql`${notificationDeliveries.attempts} + 1`,
      })
      .where(inArray(notificationDeliveries.id, ids))
      .run()

    // Step 3: Récupérer les payloads depuis notification_events
    const eventIds = pending.map((p) => p.eventId)
    const events = db
      .select({
        id: notificationEvents.id,
        payload: notificationEvents.payload,
      })
      .from(notificationEvents)
      .where(inArray(notificationEvents.id, eventIds))
      .all()

    const eventMap = new Map(events.map((e) => [e.id, e.payload ?? '{}']))

    return pending.map((p) => ({
      id: p.id,
      eventId: p.eventId,
      recipient: p.recipient,
      provider: p.provider,
      attempts: (p.attempts ?? 0) + 1,
      payload: eventMap.get(p.eventId) ?? '{}',
    }))
  })

  return claim()
}

/**
 * Marque une livraison comme envoyée avec succès.
 */
export async function markDeliverySent(deliveryId: number): Promise<void> {
  await db
    .update(notificationDeliveries)
    .set({
      status: 'sent',
      sentAt: new Date(),
      lastError: null,
    })
    .where(eq(notificationDeliveries.id, deliveryId))
}

/**
 * Schedule un retry avec backoff exponentiel.
 * @param baseDelayMs Délai de base (ex: 1000ms)
 * @param maxDelayMs Délai max (ex: 30000ms)
 */
export async function scheduleRetry(
  deliveryId: number,
  attempts: number,
  baseDelayMs: number,
  maxDelayMs: number,
  errorMessage?: string
): Promise<void> {
  // Backoff exponentiel: base * 2^(attempts-1), capped at maxDelayMs
  const delay = Math.min(baseDelayMs * Math.pow(2, attempts - 1), maxDelayMs)
  const nextRetryAt = new Date(Date.now() + delay)

  await db
    .update(notificationDeliveries)
    .set({
      status: 'pending',
      nextRetryAt,
      lastError: errorMessage ?? null,
    })
    .where(eq(notificationDeliveries.id, deliveryId))
}

/**
 * Marque une livraison comme échouée définitivement (max attempts atteint).
 */
export async function markDeliveryFailed(
  deliveryId: number,
  errorMessage: string
): Promise<void> {
  await db
    .update(notificationDeliveries)
    .set({
      status: 'failed',
      lastError: errorMessage,
    })
    .where(eq(notificationDeliveries.id, deliveryId))
}

/**
 * Récupère les deliveries échouées récemment (pour monitoring).
 */
export async function getFailedDeliveries(
  since: Date,
  limit = 50
): Promise<
  Array<{
    id: number
    eventId: number
    recipient: string
    attempts: number
    lastError: string | null
    createdAt: Date
  }>
> {
  return db.query.notificationDeliveries.findMany({
    where: and(
      eq(notificationDeliveries.status, 'failed'),
      lte(notificationDeliveries.createdAt, since)
    ),
    orderBy: desc(notificationDeliveries.createdAt),
    limit,
    columns: {
      id: true,
      eventId: true,
      recipient: true,
      attempts: true,
      lastError: true,
      createdAt: true,
    },
  }) as Promise<
    Array<{
      id: number
      eventId: number
      recipient: string
      attempts: number
      lastError: string | null
      createdAt: Date
    }>
  >
}

/**
 * Compte les deliveries pending (pour monitoring).
 */
export async function countPendingDeliveries(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.status, 'pending'))
  return result[0]?.count ?? 0
}

/**
 * Vérifie si toutes les deliveries d'un event sont terminées (sent ou failed).
 */
export async function isEventFullyDispatched(eventId: number): Promise<boolean> {
  const unfinished = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationDeliveries)
    .where(
      and(
        eq(notificationDeliveries.eventId, eventId),
        inArray(notificationDeliveries.status, ['pending', 'processing'])
      )
    )
  return (unfinished[0]?.count ?? 0) === 0
}
