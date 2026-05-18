/**
 * EvolutionListener — DEPRECATED: remplacé par le Dispatcher + OutboxWorker.
 *
 * Ce fichier est conservé pour compatibilité si du code externe émet
 * directement via notificationBus.emit(). Dans ce cas, ce listener
 * forward vers le Dispatcher (qui gère la dédup DB et l'outbox).
 *
 * Le bootstrap.ts ne démarre plus ce listener (startNotificationsV2
 * utilise maintenant OutboxWorker directement).
 */

import { notificationBus } from '../event-bus'
import { dispatch } from '../dispatcher'
import { ALL_EVENTS } from '../types'
import type { NotificationEventPayload } from '../types'

export class EvolutionListener {
  private disposers: Array<() => void> = []
  private started = false

  start(): void {
    if (this.started) return
    this.started = true

    // Forward tous les events du bus vers le Dispatcher (qui gère la dédup DB)
    for (const ev of ALL_EVENTS) {
      const off = notificationBus.on(ev, (payload) => this.handle(payload))
      this.disposers.push(off)
    }

    console.log('[NotificationsV2][EvolutionListener] Started (DEPRECATED: forwards to Dispatcher)')
  }

  stop(): void {
    this.disposers.forEach(d => d())
    this.disposers = []
    this.started = false
  }

  private async handle(payload: NotificationEventPayload): Promise<void> {
    // Forward au Dispatcher qui gère la dédup DB atomique et l'outbox
    await dispatch(payload.event, payload)
  }
}
