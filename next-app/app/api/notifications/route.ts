import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { notifications } from '@/lib/db/schema'
import { eq, desc, and, count } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/notifications — list current user's notifications
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !(user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((user as any).id)

    const items = await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    })

    const sanitizedItems = items.map(item => {
      let link = item.link
      
      // 1) Si le lien est manquant mais qu'on a les infos média, on le reconstruit
      if (!link && item.mediaId && item.mediaType) {
        link = `/dashboard/media/${item.mediaId}?type=${item.mediaType}`
      }

      // 2) Si le lien est au format obsolète, on le corrige
      if (link && (link.includes('/movie/') || link.includes('/tv/'))) {
        try {
          const parts = link.split('/')
          const mediaType = parts[parts.length - 2]
          const tmdbId = parts[parts.length - 1]
          if (mediaType && tmdbId) {
            link = `/dashboard/media/${tmdbId}?type=${mediaType}`
          }
        } catch {
          // Fallback
        }
      }

      return {
        ...item,
        link
      }
    })

    const unreadResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    const unreadCount = unreadResult[0]?.count ?? 0

    return NextResponse.json({ items: sanitizedItems, unreadCount })
  } catch (error) {
    logger.error('[NotificationsAPI] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  try {
    const user = await getCurrentUser()
    if (!user || !(user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((user as any).id)

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[NotificationsAPI] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
