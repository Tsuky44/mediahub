'use server'

import { db } from '@/lib/db/drizzle'
import { users, notifications } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function getNotifications() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return []

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email))

    if (!dbUser) return []

    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.userId, dbUser.id),
      orderBy: desc(notifications.createdAt),
      limit: 50
    })

    return userNotifications
  } catch (error) {
    logger.error('Failed to fetch notifications:', error)
    return []
  }
}

export async function getUnreadCount() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return 0

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email))

    if (!dbUser) return 0

    const result = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(notifications)
      .where(and(eq(notifications.userId, dbUser.id), eq(notifications.isRead, false)))
      .get()
    const count = result?.count || 0

    return count
  } catch (error) {
    logger.error('Failed to get unread count:', error)
    return 0
  }
}

export async function markAsRead(id: number) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false }

    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .run()

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error('Failed to mark notification as read:', error)
    return { success: false }
  }
}

export async function markAllAsRead() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return { success: false }

    const [dbUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email))

    if (!dbUser) return { success: false }

    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, dbUser.id), eq(notifications.isRead, false)))
      .run()

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error)
    return { success: false }
  }
}

export async function deleteNotification(id: number) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false }

    await db.delete(notifications).where(eq(notifications.id, id)).run()

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error('Failed to delete notification:', error)
    return { success: false }
  }
}
