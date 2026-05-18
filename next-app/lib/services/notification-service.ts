import { db } from '@/lib/db/drizzle'
import { notifications, users, roles } from '@/lib/db/schema'
import { eq, or, and, ne, not } from 'drizzle-orm'
import { trackerService } from './tracker-service'
import { getTmdbService } from './tmdb'

export class NotificationService {
  /**
   * Send a notification to a specific user.
   */
  static async notifyUser(userId: number, title: string, message: string, type: string, data: { mediaId?: string, mediaType?: string, posterPath?: string, link?: string } = {}) {
    try {
      // Try to fetch poster path if missing and media info is available
      if (!data.posterPath && data.mediaId && (data.mediaType === 'movie' || data.mediaType === 'tv')) {
        try {
          const tmdb = await getTmdbService()
          if (tmdb) {
            const id = parseInt(data.mediaId)
            if (!isNaN(id)) {
              const poster = await tmdb.getPosterPath(id, data.mediaType as 'movie' | 'tv')
              if (poster) {
                data.posterPath = poster
              }
            }
          }
        } catch (e) {
          console.warn('[NotificationService] Failed to fetch poster:', e)
        }
      }

      const inserted = await db.insert(notifications).values({
        userId,
        title,
        message,
        type,
        mediaId: data.mediaId,
        mediaType: data.mediaType,
        posterPath: data.posterPath,
        link: data.link,
        isRead: false,
        createdAt: new Date()
      }).returning()
      const notification = inserted[0]

      trackerService.broadcastNotification([userId], notification)
      return notification
    } catch (error) {
      console.error('[NotificationService] Failed to notify user:', error)
    }
  }

  /**
   * Send a notification to all admin users.
   * Checks for duplicates based on type and version (stored in mediaId) to avoid spam.
   */
  static async notifyAdmins(title: string, message: string, type: string, metadata: { version?: string, container?: string } = {}) {
    try {
      // 1. Find all admin users (only role='admin' check; relation-based filter handled separately if needed)
      const admins = await db.query.users.findMany({
        where: eq(users.role, 'admin'),
        columns: { id: true }
      })

      if (admins.length === 0) return

      const { version, container } = metadata

      // 2. Create notifications for each admin
      for (const admin of admins) {
        // Check for duplicate if version is provided
        if (type === 'system_update' && version) {
          const existing = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, admin.id),
              eq(notifications.type, 'system_update'),
              eq(notifications.mediaId, version)
            )
          })
          if (existing) continue
        }

        const inserted = await db.insert(notifications).values({
          userId: admin.id,
          title,
          message,
          type,
          mediaId: version || null,
          mediaType: container || 'system',
          link: '/dashboard/settings?tab=services&subtab=maintenance',
          isRead: false,
          createdAt: new Date()
        }).returning()
        const notification = inserted[0]

        trackerService.broadcastNotification([admin.id], notification)
      }
    } catch (error) {
      console.error('[NotificationService] Failed to notify admins:', error)
    }
  }

  /**
   * Clears all system update notifications for admins.
   * Useful when updates are performed or no longer available.
   * @param exclude - Optional filter to keep specific notifications (e.g. current version)
   */
  static async clearSystemUpdateNotifications(exclude?: { mediaId: string, mediaType: string }) {
    try {
      const conditions = [eq(notifications.type, 'system_update')]
      if (exclude) {
        conditions.push(not(and(
          eq(notifications.mediaId, exclude.mediaId),
          eq(notifications.mediaType, exclude.mediaType)
        )!))
      }
      await db.delete(notifications).where(and(...conditions))
    } catch (error) {
      console.error('[NotificationService] Failed to clear update notifications:', error)
    }
  }
}
