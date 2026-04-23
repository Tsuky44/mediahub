/**
 * Bootstrap — wires the NotificationsV2 module together.
 * Call `startNotificationsV2()` once at app startup (instrumentation.ts).
 */

import { EvolutionListener } from './listeners/evolution-listener'
import { DownloadPoller } from './pollers/download-poller'
import { AvailabilityPoller } from './pollers/availability-poller'

const globalForV2 = globalThis as unknown as {
  __notificationsV2Started?: boolean
  __notificationsV2Refs?: {
    listener: EvolutionListener
    downloadPoller: DownloadPoller
    availabilityPoller: AvailabilityPoller
  }
}

export function startNotificationsV2(): void {
  if (globalForV2.__notificationsV2Started) return
  if (process.env.NEXT_RUNTIME === 'edge') return

  const listener = new EvolutionListener()
  const downloadPoller = new DownloadPoller()
  const availabilityPoller = new AvailabilityPoller()

  listener.start()
  downloadPoller.start()
  availabilityPoller.start()

  globalForV2.__notificationsV2Refs = { listener, downloadPoller, availabilityPoller }
  globalForV2.__notificationsV2Started = true

  console.log('[NotificationsV2] Bootstrap complete')
}

export function stopNotificationsV2(): void {
  const refs = globalForV2.__notificationsV2Refs
  if (!refs) return
  refs.listener.stop()
  refs.downloadPoller.stop()
  refs.availabilityPoller.stop()
  globalForV2.__notificationsV2Started = false
  globalForV2.__notificationsV2Refs = undefined
}
