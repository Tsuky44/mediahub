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

// Convenience helpers to emit events without touching the bus directly.
import { notificationBus } from './event-bus'
import { NOTIFICATION_EVENTS } from './types'
import type { MediaInfo, RequesterInfo, DownloadContext, FailureContext } from './types'

export const Notify = {
  mediaRequested(media: MediaInfo, requester?: RequesterInfo) {
    notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_REQUESTED, { media, requester })
  },
  mediaApproved(media: MediaInfo, requester?: RequesterInfo) {
    notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_APPROVED, { media, requester })
  },
  mediaImporting(media: MediaInfo, download?: DownloadContext, requester?: RequesterInfo) {
    notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_IMPORTING, { media, download, requester })
  },
  mediaAvailable(media: MediaInfo, requester?: RequesterInfo) {
    notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_AVAILABLE, { media, requester })
  },
  mediaFailed(media: MediaInfo, failure: FailureContext, requester?: RequesterInfo) {
    notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_FAILED, { media, failure, requester })
  },
}
