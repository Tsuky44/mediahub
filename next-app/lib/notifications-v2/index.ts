/**
 * Notifications V2 — public API.
 *
 * Import from this file ONLY from your application code.
 * Internal modules (providers, listeners, pollers) should not be imported directly.
 */

export { notificationBus } from './event-bus'
export { NOTIFICATION_EVENTS, ALL_EVENTS } from './types'
export type {
  NotificationEvent,
  NotificationEventPayload,
  MediaInfo,
  RequesterInfo,
  DownloadContext,
  FailureContext,
  NotificationsV2Config,
  EventRouteConfig,
} from './types'

export { ConfigStore } from './config/config-store'
export { startNotificationsV2, stopNotificationsV2 } from './bootstrap'
export { dispatch, type DispatchResult } from './dispatcher'
export * as NotificationStore from './store'
export { OutboxWorker } from './outbox'

// Convenience helpers to dispatch events directly (bypasses event bus → prevents "dropped before listener ready" issue).
// Ces helpers utilisent le Dispatcher qui enregistre en DB + enqueue dans l'outbox.
import { dispatch } from './dispatcher'
import { NOTIFICATION_EVENTS } from './types'
import type { MediaInfo, RequesterInfo, DownloadContext, FailureContext } from './types'

export const Notify = {
  async mediaRequested(media: MediaInfo, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_REQUESTED, { media, requester })
  },
  async mediaApproved(media: MediaInfo, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_APPROVED, { media, requester })
  },
  async mediaGrabbed(media: MediaInfo, download?: DownloadContext, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_GRABBED, { media, download, requester })
  },
  async mediaDownloading(media: MediaInfo, download?: DownloadContext, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOADING, { media, download, requester })
  },
  async mediaDownloadComplete(media: MediaInfo, download?: DownloadContext, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE, { media, download, requester })
  },
  async mediaImporting(media: MediaInfo, download?: DownloadContext, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_IMPORTING, { media, download, requester })
  },
  async mediaAvailable(media: MediaInfo, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_AVAILABLE, { media, requester })
  },
  async mediaFailed(media: MediaInfo, failure: FailureContext, requester?: RequesterInfo) {
    await dispatch(NOTIFICATION_EVENTS.MEDIA_FAILED, { media, failure, requester })
  },
}
