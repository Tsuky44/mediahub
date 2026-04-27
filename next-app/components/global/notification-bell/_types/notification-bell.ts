/**
 * Notification entry as returned by the `getNotifications()` server action.
 *
 * The interface is named `NotificationItem` to avoid shadowing the global
 * `Notification` Web API type when this file is imported in the browser.
 * Mirrors the Prisma `Notification` model fields actually consumed by the UI.
 */
export interface NotificationItem {
    id: number
    title: string
    message: string
    type: string
    mediaId: string | null
    mediaType: string | null
    posterPath: string | null
    isRead: boolean
    link: string | null
    createdAt: string | Date
}
