/**
 * RealtimeOrchestrator V3 — Déprécié (plus de polling API)
 *
 * Ce fichier est conservé pour compatibilité mais n'est plus utilisé.
 * L'AvailabilityPoller gère maintenant le fallback DB pour MEDIA_AVAILABLE.
 * Les webhooks Radarr/Sonarr gèrent les événements temps réel.
 *
 * @deprecated Utiliser AvailabilityPoller à la place
 */

import { logger } from '@/lib/logger'

export class RealtimeOrchestrator {
  private started = false

  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    logger.info('[NotifV2][Realtime] DEPRECATED: RealtimeOrchestrator is no longer used. Use AvailabilityPoller instead.')
  }

  stop(): void {
    this.started = false
    logger.info('[NotifV2][Realtime] Stopped (deprecated)')
  }
}

