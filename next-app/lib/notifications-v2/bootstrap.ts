/**
 * Bootstrap — wires the NotificationsV2 module together (Outbox pattern).
 * Call `startNotificationsV2()` once at app startup (instrumentation.ts).
 *
 * Architecture V3 simplifiée:
 * - Webhooks Radarr/Sonarr → Dispatcher → EventStore → OutboxWorker → EvolutionProvider
 * - AvailabilityPoller (fallback DB) → Dispatcher → EventStore → OutboxWorker → EvolutionProvider
 *
 * Plus de polling API, plus de BatchStatusPoller.
 */

import { OutboxWorker } from './outbox'
import { AvailabilityPoller } from './pollers/availability-poller'
import { QueuePoller } from './pollers/queue-poller'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db/drizzle'
import { notificationEvents } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

const globalForV2 = globalThis as unknown as {
  __notificationsV2Started?: boolean
  __notificationsV2ProcessId?: number
  __notificationsV2Refs?: {
    outboxWorker: OutboxWorker
    availabilityPoller: AvailabilityPoller
    queuePoller: QueuePoller
  }
}

export async function startNotificationsV2(): Promise<void> {
  // Guard: already started
  if (globalForV2.__notificationsV2Started) {
    logger.info('[NotificationsV2] Bootstrap already done, skipping')
    return
  }

  // Guard: edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    logger.info('[NotificationsV2] Skipping bootstrap on edge runtime')
    return
  }

  // Guard: different process (dev hot reload safety)
  const currentPid = process.pid
  if (globalForV2.__notificationsV2ProcessId && globalForV2.__notificationsV2ProcessId !== currentPid) {
    logger.info(`[NotificationsV2] New process detected (${currentPid}), restarting...`)
    stopNotificationsV2()
  }
  globalForV2.__notificationsV2ProcessId = currentPid

  logger.info('[NotificationsV2] Bootstrap starting...')

  // Purger les anciennes dedup_keys sans suffixe de date (format sans :YYYY-MM-DD)
  // Ces clés permanentes empêchent les webhooks de fonctionner après le premier event.
  // On supprime uniquement les events non-permanents (GRABBED, AVAILABLE, etc.)
  // sans date dans la clé, créés avant le fix de dédup journalière.
  try {
    const deletedSeed = await db
      .delete(notificationEvents)
      .where(sql`json_extract(${notificationEvents.payload}, '$.requester.name') = 'seed'`)
    logger.info(`[NotificationsV2] Purged seed rows: ${(deletedSeed as any)?.changes ?? '?'}`)

    // Purge les clés MEDIA_GRABBED, MEDIA_DOWNLOADING, MEDIA_IMPORTING, MEDIA_DOWNLOAD_COMPLETE
    // sans date (format ancien: req:X:movie:Y:MEDIA_GRABBED sans :2025-xx-xx à la fin)
    // On identifie par: clé contient MEDIA_ mais pas un pattern de date YYYY-MM-DD
    const deletedOld = await db
      .delete(notificationEvents)
      .where(sql`
        ${notificationEvents.event} IN ('MEDIA_GRABBED','MEDIA_DOWNLOADING','MEDIA_DOWNLOAD_COMPLETE','MEDIA_IMPORTING')
        AND ${notificationEvents.dedupKey} NOT LIKE '%-____-__-__'
        AND ${notificationEvents.status} = 'dispatched'
      `)
    logger.info(`[NotificationsV2] Purged old dedup_keys without date suffix: ${(deletedOld as any)?.changes ?? '?'}`)

    // Purge les anciennes clés MEDIA_AVAILABLE / SEASON_PARTIALLY_AVAILABLE AVEC date suffix.
    // Ces events sont maintenant à dédup permanente — les rows seront re-créées (sans date)
    // par le seed de l'AvailabilityPoller au startup, ce qui évite le re-spam quotidien.
    const deletedDated = await db
      .delete(notificationEvents)
      .where(sql`
        ${notificationEvents.event} IN ('MEDIA_AVAILABLE','SEASON_PARTIALLY_AVAILABLE')
        AND ${notificationEvents.dedupKey} LIKE '%-____-__-__'
      `)
    logger.info(`[NotificationsV2] Purged old dated MEDIA_AVAILABLE/SEASON_PARTIALLY_AVAILABLE keys: ${(deletedDated as any)?.changes ?? '?'}`)
  } catch (e) {
    logger.warn('[NotificationsV2] Failed to purge stale keys (non-fatal):', e)
  }

  // OutboxWorker: processe les deliveries pending toutes les 5s
  const outboxWorker = new OutboxWorker()
  outboxWorker.start()

  // AvailabilityPoller: fallback DB polling pour MEDIA_AVAILABLE (30s interval)
  const availabilityPoller = new AvailabilityPoller()
  availabilityPoller.start()

  // QueuePoller: détecte les états intermédiaires (DOWNLOADING / DOWNLOAD_COMPLETE / IMPORTING)
  // via la queue Radarr/Sonarr toutes les 5s (webhooks ne fournissent pas ces events).
  // 5s pour capter les transitions rapides (Sonarr peut downloader/importer en < 15s).
  const queuePoller = new QueuePoller(5_000)
  queuePoller.start()

  globalForV2.__notificationsV2Refs = { outboxWorker, availabilityPoller, queuePoller }
  globalForV2.__notificationsV2Started = true

  logger.info('[NotificationsV2] Bootstrap complete (OutboxWorker + AvailabilityPoller@30s + QueuePoller@5s)')
}

/**
 * Purge toutes les dedup keys (DB + cache mémoire) pour un tmdbId donné.
 * À appeler quand une demande ou un média est supprimé, pour que les notifs
 * repartent de zéro si le média est re-demandé.
 */
export async function purgeNotifDedupForTmdbId(tmdbId: string): Promise<void> {
  try {
    const { db } = await import('@/lib/db/drizzle')
    const { notificationEvents } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(notificationEvents).where(eq(notificationEvents.tmdbId, tmdbId))
    logger.info(`[NotificationsV2] Purged DB dedup keys for tmdbId=${tmdbId}`)
  } catch (e) {
    logger.warn(`[NotificationsV2] Failed to purge DB dedup keys for tmdbId=${tmdbId}:`, e)
  }
  globalForV2.__notificationsV2Refs?.availabilityPoller.purgeForTmdbId(tmdbId)
}

export function stopNotificationsV2(): void {
  const refs = globalForV2.__notificationsV2Refs
  if (!refs) return
  refs.outboxWorker.stop()
  refs.availabilityPoller.stop()
  refs.queuePoller.stop()
  globalForV2.__notificationsV2Started = false
  globalForV2.__notificationsV2Refs = undefined
}
