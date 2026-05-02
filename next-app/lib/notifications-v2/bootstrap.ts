/**
 * Bootstrap — wires the NotificationsV2 module together.
 * Call `startNotificationsV2()` once at app startup (instrumentation.ts).
 */

import { EvolutionListener } from './listeners/evolution-listener'
import { AvailabilityPoller } from './pollers/availability-poller'
import { RealtimeOrchestrator } from './realtime/realtime-orchestrator'

const globalForV2 = globalThis as unknown as {
  __notificationsV2Started?: boolean
  __notificationsV2Refs?: {
    listener: EvolutionListener
    realtime: RealtimeOrchestrator
    availabilityPoller: AvailabilityPoller
  }
}

export async function startNotificationsV2(): Promise<void> {
  if (globalForV2.__notificationsV2Started) {
    console.log('[NotificationsV2] Bootstrap already done, skipping')
    return
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[NotificationsV2] Skipping bootstrap on edge runtime')
    return
  }

  console.log('[NotificationsV2] Bootstrap starting...')

  const listener = new EvolutionListener()
  const realtime = new RealtimeOrchestrator()
  const availabilityPoller = new AvailabilityPoller()

  listener.start()
  await realtime.start()
  availabilityPoller.start()

  globalForV2.__notificationsV2Refs = { listener, realtime, availabilityPoller }
  globalForV2.__notificationsV2Started = true

  console.log('[NotificationsV2] Bootstrap complete (EvolutionListener + RealtimeOrchestrator + AvailabilityPoller)')
}

export function stopNotificationsV2(): void {
  const refs = globalForV2.__notificationsV2Refs
  if (!refs) return
  refs.listener.stop()
  refs.realtime.stop()
  refs.availabilityPoller.stop()
  globalForV2.__notificationsV2Started = false
  globalForV2.__notificationsV2Refs = undefined
}
