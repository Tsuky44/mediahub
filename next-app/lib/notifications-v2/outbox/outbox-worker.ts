/**
 * Outbox Worker — processe les deliveries pending et envoie via Evolution.
 * Boucle toutes les X secondes, claim les pending, envoie, retry si échec.
 * Garantit: pas de message perdu (persisté en DB jusqu'à sent/failed).
 */

import { EvolutionProvider } from '../providers/evolution-provider'
import { TemplateRenderer } from '../templates/template-renderer'
import { ConfigStore } from '../config/config-store'
import { logger } from '@/lib/logger'
import type { NotificationEventPayload } from '../types'
import {
  claimDueDeliveries,
  markDeliverySent,
  scheduleRetry,
  markDeliveryFailed,
  isEventFullyDispatched,
  markEventDispatched,
} from '../store'

const WORKER_INTERVAL_MS = 5000
const CLAIM_BATCH_SIZE = 10

const globalForWorker = globalThis as unknown as { __notifV2OutboxWorkerInstance?: OutboxWorker }

/** Récupère l'instance active du worker (pour trigger depuis le dispatcher). */
export function getOutboxWorkerInstance(): OutboxWorker | undefined {
  return globalForWorker.__notifV2OutboxWorkerInstance
}

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null
  private isRunning = false
  private abortController: AbortController | null = null

  /**
   * Démarre le worker. Peut être appelé plusieurs fois (idempotent).
   */
  start(): void {
    if (this.isRunning) {
      logger.info('[NotifV2][OutboxWorker] Already running')
      return
    }

    // Guard against double-start in dev hot reload
    const globalKey = '__notifV2OutboxWorker'
    const globalRef = globalThis as unknown as Record<string, OutboxWorker | undefined>
    if (globalRef[globalKey] && globalRef[globalKey] !== this) {
      logger.info('[NotifV2][OutboxWorker] Another instance exists in globalThis, stopping old one')
      globalRef[globalKey]?.stop()
    }
    globalRef[globalKey] = this
    globalForWorker.__notifV2OutboxWorkerInstance = this

    this.isRunning = true
    this.abortController = new AbortController()
    logger.info('[NotifV2][OutboxWorker] Started')

    // Tick initial
    this.tick().catch((err) => logger.error('[NotifV2][OutboxWorker] Initial tick error:', err))

    // Boucle
    this.timer = setInterval(() => {
      if (!this.isRunning) return
      this.tick().catch((err) => logger.error('[NotifV2][OutboxWorker] Tick error:', err))
    }, WORKER_INTERVAL_MS)
  }

  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.abortController?.abort()
    this.abortController = null
    if (globalForWorker.__notifV2OutboxWorkerInstance === this) {
      globalForWorker.__notifV2OutboxWorkerInstance = undefined
    }
    logger.info('[NotifV2][OutboxWorker] Stopped')
  }

  /**
   * Déclenche un tick immédiat (sans attendre l'interval de 5s).
   * Appelé par le dispatcher après un enqueue pour envoi quasi-instantané.
   */
  triggerNow(): void {
    if (!this.isRunning) return
    this.tick().catch((err) => logger.error('[NotifV2][OutboxWorker] Triggered tick error:', err))
  }

  private async tick(): Promise<void> {
    const config = await ConfigStore.load()
    if (!config.enabled) {
      // Config disabled: ne rien faire ce tick, mais continuer à poller
      // (au cas où l'admin réactive)
      return
    }

    // Claim pending deliveries
    const due = await claimDueDeliveries(CLAIM_BATCH_SIZE)
    if (due.length === 0) return

    logger.info(`[NotifV2][OutboxWorker] Processing ${due.length} delivery(ies)`)

    const provider = new EvolutionProvider(config.evolution, config.retry)

    for (const delivery of due) {
      if (this.abortController?.signal.aborted) break

      await this.processDelivery(delivery, provider, config)
    }
  }

  private async processDelivery(
    delivery: {
      id: number
      eventId: number
      recipient: string
      provider: string
      attempts: number
      payload: string
    },
    provider: EvolutionProvider,
    config: Awaited<ReturnType<typeof ConfigStore.load>>
  ): Promise<void> {
    const tag = `[NotifV2][OutboxWorker][delivery=${delivery.id}]`

    try {
      // Parse payload
      let payload: NotificationEventPayload
      try {
        payload = JSON.parse(delivery.payload)
      } catch (e) {
        logger.error(`${tag} Failed to parse payload JSON:`, e)
        await markDeliveryFailed(delivery.id, 'Invalid payload JSON')
        return
      }

      // Get template config
      const route = config.events[payload.event]
      if (!route) {
        logger.error(`${tag} No route config for event ${payload.event}`)
        await markDeliveryFailed(delivery.id, 'No route config')
        return
      }

      // Render message
      const text = TemplateRenderer.render(payload, route)
      const mediaUrl = route.includePoster ? buildPosterUrl(payload.media.posterPath) : undefined

      // Send
      const result = await provider.send({ to: delivery.recipient, text, mediaUrl })

      if (result.success) {
        logger.info(`${tag} Sent successfully to ${delivery.recipient} (attempts=${delivery.attempts})`)
        await markDeliverySent(delivery.id)

        // Check if event fully dispatched
        const fullyDispatched = await isEventFullyDispatched(delivery.eventId)
        if (fullyDispatched) {
          await markEventDispatched(delivery.eventId)
          logger.info(`${tag} Event ${delivery.eventId} fully dispatched`)
        }
      } else {
        // Failed: schedule retry or mark failed
        const maxAttempts = config.retry.maxAttempts
        if (delivery.attempts >= maxAttempts) {
          logger.error(`${tag} Max attempts (${maxAttempts}) reached. Marking failed.`)
          await markDeliveryFailed(delivery.id, result.error ?? 'Max attempts reached')

          // Still mark event dispatched if all deliveries done (even if failed)
          const fullyDispatched = await isEventFullyDispatched(delivery.eventId)
          if (fullyDispatched) {
            await markEventDispatched(delivery.eventId)
          }
        } else {
          logger.warn(`${tag} Send failed (attempt ${delivery.attempts}/${maxAttempts}): ${result.error}. Scheduling retry.`)
          await scheduleRetry(
            delivery.id,
            delivery.attempts,
            config.retry.baseDelayMs,
            config.retry.maxDelayMs,
            result.error
          )
        }
      }
    } catch (err) {
      logger.error(`${tag} Unexpected error processing delivery:`, err)
      const errorMsg = err instanceof Error ? err.message : String(err)

      // Retry ou fail selon attempts
      const maxAttempts = config.retry.maxAttempts
      if (delivery.attempts >= maxAttempts) {
        await markDeliveryFailed(delivery.id, errorMsg)
      } else {
        await scheduleRetry(delivery.id, delivery.attempts, config.retry.baseDelayMs, config.retry.maxDelayMs, errorMsg)
      }
    }
  }
}

function buildPosterUrl(posterPath?: string): string | undefined {
  if (!posterPath) return undefined
  if (posterPath.startsWith('http')) return posterPath
  return `https://image.tmdb.org/t/p/w500${posterPath}`
}
