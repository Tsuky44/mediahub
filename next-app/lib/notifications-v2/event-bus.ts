/**
 * Typed Event Bus — in-process Pub/Sub.
 *
 * SOLID notes:
 *  - Single Responsibility: routage d'événements, rien d'autre.
 *  - Open/Closed: on ajoute des listeners sans modifier la classe.
 *  - Dependency Inversion: les consommateurs dépendent de l'interface, pas de Node EventEmitter.
 */

import { EventEmitter } from 'events'
import type { NotificationEvent, NotificationEventPayload } from './types'
import { NOTIFICATION_EVENTS } from './types'

type Handler = (payload: NotificationEventPayload) => void | Promise<void>

class NotificationEventBus {
  private readonly emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // Allow many listeners without noisy warnings (pollers + listeners can grow).
    this.emitter.setMaxListeners(50)
  }

  on(event: NotificationEvent, handler: Handler): () => void {
    this.emitter.on(event, handler)
    return () => this.emitter.off(event, handler)
  }

  /** Listen to ALL events. Useful for logging / analytics listeners. */
  onAny(handler: Handler): () => void {
    const off: Array<() => void> = []
    for (const e of Object.values(NOTIFICATION_EVENTS)) {
      off.push(this.on(e, handler))
    }
    return () => off.forEach(f => f())
  }

  off(event: NotificationEvent, handler: Handler): void {
    this.emitter.off(event, handler)
  }

  /**
   * Emit an event. Fire-and-forget: handlers run async, errors are caught per-handler
   * so a broken handler cannot crash the emitter.
   */
  async emit(event: NotificationEvent, payload: Omit<NotificationEventPayload, 'event' | 'timestamp' | 'correlationId'> & Partial<Pick<NotificationEventPayload, 'correlationId' | 'timestamp'>>): Promise<void> {
    const fullPayload: NotificationEventPayload = {
      event,
      timestamp: payload.timestamp ?? new Date().toISOString(),
      correlationId: payload.correlationId ?? cryptoRandomId(),
      media: payload.media,
      requester: payload.requester,
      download: payload.download,
      failure: payload.failure,
    }

    // Delegate to Node EventEmitter; wrap async handlers so exceptions are isolated.
    const listeners = this.emitter.listeners(event) as Handler[]
    console.log(
      `[NotificationsV2][EventBus] emit ${event} (cid=${fullPayload.correlationId}) → ${listeners.length} listener(s) | media="${fullPayload.media?.title}"`
    )
    if (listeners.length === 0) {
      console.warn(
        `[NotificationsV2][EventBus] ⚠️ No listener registered for ${event}. Did startNotificationsV2() run? (process.env.NEXT_RUNTIME=${process.env.NEXT_RUNTIME})`
      )
    }
    await Promise.all(
      listeners.map((listener) =>
        Promise.resolve()
          .then(() => listener(fullPayload))
          .catch((err) => {
            console.error(`[NotificationsV2][EventBus] Handler error for ${event}:`, err)
          })
      )
    )
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners()
  }
}

function cryptoRandomId(): string {
  // Simple correlation id without external deps.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Singleton — survives hot reloads in dev via globalThis.
const globalForBus = globalThis as unknown as {
  __notificationsV2Bus?: NotificationEventBus
}

export const notificationBus: NotificationEventBus =
  globalForBus.__notificationsV2Bus ?? new NotificationEventBus()

if (!globalForBus.__notificationsV2Bus) {
  globalForBus.__notificationsV2Bus = notificationBus
}

export type { NotificationEventBus }
