/**
 * Dispatcher — orchestrateur central.
 * 1. Record l'event en DB (dédup atomique via UNIQUE constraint)
 * 2. Résout les destinataires depuis la config
 * 3. Enqueue les deliveries dans l'outbox
 *
 * Ne fait PAS l'envoi direct — c'est le OutboxWorker qui s'en charge.
 */

import { ConfigStore } from './config/config-store'
import { logger } from '@/lib/logger'
import type { NotificationEvent, NotificationEventPayload } from './types'
import {
  recordEvent,
  markEventDispatched,
  enqueueDeliveries,
  resolveRecipients,
} from './store'
import { getOutboxWorkerInstance } from './outbox/outbox-worker'

export interface DispatchResult {
  success: boolean
  eventId?: number
  wasDuplicate: boolean
  recipients: string[]
  error?: string
  correlationId: string
}

/**
 * Dispatch un event : enregistre en DB et enqueue pour envoi.
 * C'est la méthode à appeler depuis les sources (Notify.*, pollers, etc.).
 */
export async function dispatch(
  event: NotificationEvent,
  payload: Omit<NotificationEventPayload, 'event' | 'timestamp' | 'correlationId'> &
    Partial<Pick<NotificationEventPayload, 'correlationId' | 'timestamp'>>
): Promise<DispatchResult> {
  const correlationId = payload.correlationId ?? generateCorrelationId()
  const tag = `[NotifV2][cid=${correlationId}][${event}]`

  try {
    // 1) Load config
    let config
    try {
      config = await ConfigStore.load()
    } catch (err) {
      logger.error(`${tag} Failed to load config:`, err)
      return { success: false, wasDuplicate: false, recipients: [], error: 'Config load failed', correlationId }
    }

    if (!config.enabled) {
      logger.warn(`${tag} Notifications V2 disabled (config.enabled=false). Dropping event.`)
      return { success: false, wasDuplicate: false, recipients: [], error: 'Notifications disabled', correlationId }
    }

    const route = config.events[event]
    if (!route) {
      logger.warn(`${tag} No route config for ${event}. Dropping event.`)
      return { success: false, wasDuplicate: false, recipients: [], error: 'No route config', correlationId }
    }
    if (!route.enabled) {
      logger.warn(`${tag} Route disabled for ${event}. Dropping event.`)
      return { success: false, wasDuplicate: false, recipients: [], error: 'Route disabled', correlationId }
    }

    // 2) Record event atomiquement (dédup via UNIQUE dedup_key)
    const record = await recordEvent(event, payload, { correlationId })

    if (record.wasDuplicate) {
      logger.info(`${tag} Duplicate event detected (dedup_key already exists). Skipping.`)
      return { success: true, eventId: record.eventId, wasDuplicate: true, recipients: [], correlationId }
    }

    logger.info(`${tag} Event recorded (id=${record.eventId}). Resolving recipients...`)

    // 3) Resolve recipients
    const { recipients, logInfo } = await resolveRecipients(
      config,
      event,
      payload.requester,
      config.evolution.defaultNumber
    )

    logger.info(`${tag} Recipients resolved: ${recipients.size} recipient(s) | ${logInfo}`)

    if (recipients.size === 0) {
      logger.warn(`${tag} No recipients resolved. Marking event dispatched (no deliveries).`)
      await markEventDispatched(record.eventId)
      return { success: true, eventId: record.eventId, wasDuplicate: false, recipients: [], correlationId }
    }

    // 4) Enqueue deliveries
    const deliveries = Array.from(recipients).map((recipient) => ({
      eventId: record.eventId,
      recipient,
      provider: 'evolution' as const,
    }))

    const deliveryIds = await enqueueDeliveries(deliveries)
    logger.info(`${tag} Enqueued ${deliveryIds.length} deliveries. Triggering outbox worker immediately.`)

    // Trigger le worker immédiatement pour envoi quasi-instantané (pas d'attente 5s)
    getOutboxWorkerInstance()?.triggerNow()

    return {
      success: true,
      eventId: record.eventId,
      wasDuplicate: false,
      recipients: Array.from(recipients),
      correlationId,
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`${tag} Dispatch failed:`, err)
    return { success: false, wasDuplicate: false, recipients: [], error, correlationId }
  }
}

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
