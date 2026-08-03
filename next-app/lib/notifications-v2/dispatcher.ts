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
import { NOTIFICATION_EVENTS } from './types'
import {
  recordEvent,
  markEventDispatched,
  enqueueDeliveries,
  resolveRecipients,
} from './store'
import { getOutboxWorkerInstance } from './outbox/outbox-worker'
import { createMediaAvailableNotification } from '@/lib/notifications/internal'
import { enrichRequester } from './utils/enrich-requester'

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

    // 1b) Enrichir le requester (nom/email/whatsappNumber) depuis la DB via son id
    //     si des champs manquent — évite « Demandé par : inconnu » et fiabilise
    //     la résolution du numéro pour la case « notifier le demandeur ».
    payload.requester = await enrichRequester(payload.requester)

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

    // 4) Enqueue deliveries (evolution)
    const deliveries: { eventId: number; recipient: string; provider: string }[] =
      Array.from(recipients).map((recipient) => ({
        eventId: record.eventId,
        recipient,
        provider: 'evolution',
      }))

    // 4b) Webhook désactivé — réactivation future via WebhookSection dans les settings
    // if (config.webhook?.enabled && config.webhook?.webhookUrl) {
    //   deliveries.push({ eventId: record.eventId, recipient: config.webhook.webhookUrl, provider: 'webhook' })
    // }

    if (deliveries.length === 0) {
      logger.warn(`${tag} No recipients resolved. Marking event dispatched.`)
      await markEventDispatched(record.eventId)
      return { success: true, eventId: record.eventId, wasDuplicate: false, recipients: [], correlationId }
    }

    const deliveryIds = await enqueueDeliveries(deliveries)
    logger.info(`${tag} Enqueued ${deliveryIds.length} deliveries. Triggering outbox worker immediately.`)

    // Trigger le worker immédiatement pour envoi quasi-instantané (pas d'attente 5s)
    getOutboxWorkerInstance()?.triggerNow()

    // Internal UI notification for availability events
    if (
      payload.media &&
      payload.requester?.id &&
      (event === NOTIFICATION_EVENTS.MEDIA_AVAILABLE ||
        event === NOTIFICATION_EVENTS.SEASON_AVAILABLE ||
        event === NOTIFICATION_EVENTS.EPISODE_AVAILABLE ||
        event === NOTIFICATION_EVENTS.SEASON_PARTIALLY_AVAILABLE)
    ) {
      createMediaAvailableNotification(payload.media, payload.requester.id).catch(() => {})
    }

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
