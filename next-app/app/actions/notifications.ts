'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return []

    const dbUser = await (prisma as any).user.findUnique({
      where: { 
        email: user.email
      },
      select: { id: true }
    })

    if (!dbUser) return []

    const notifications = await (prisma as any).notification.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return notifications
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
}

export async function getUnreadCount() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return 0

    const dbUser = await (prisma as any).user.findUnique({
      where: { 
        email: user.email
      },
      select: { id: true }
    })

    if (!dbUser) return 0

    const count = await (prisma as any).notification.count({
      where: {
        userId: dbUser.id,
        isRead: false
      }
    })

    return count
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }
}

export async function markAsRead(id: number) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false }

    await (prisma as any).notification.update({
      where: { id },
      data: { isRead: true }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return { success: false }
  }
}

export async function markAllAsRead() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return { success: false }

    const dbUser = await (prisma as any).user.findUnique({
      where: { 
        email: user.email
      },
      select: { id: true }
    })

    if (!dbUser) return { success: false }

    await (prisma as any).notification.updateMany({
      where: { 
        userId: dbUser.id,
        isRead: false
      },
      data: { isRead: true }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return { success: false }
  }
}

export async function deleteNotification(id: number) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false }

    await (prisma as any).notification.delete({
      where: { id }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return { success: false }
  }
}
