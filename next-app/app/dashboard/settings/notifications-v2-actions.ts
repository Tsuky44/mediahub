'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ConfigStore } from '@/lib/notifications-v2'
import type { NotificationsV2Config } from '@/lib/notifications-v2'
import { notificationBus, NOTIFICATION_EVENTS } from '@/lib/notifications-v2'

/** Only admins can manage config. */
async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  if ((user as any).role !== 'admin' && (user as any).role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return user
}

export async function getNotificationsV2Config() {
  await assertAdmin()
  return ConfigStore.load(true)
}

export async function saveNotificationsV2Config(cfg: NotificationsV2Config) {
  await assertAdmin()
  await ConfigStore.save(cfg)
  return { success: true }
}

export async function getUsersForNotifications() {
  await assertAdmin()
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, whatsappNumber: true },
    orderBy: { name: 'asc' },
  })
  return users.map(u => ({
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    hasWhatsapp: !!(u.whatsappNumber && u.whatsappNumber.trim()),
  }))
}

export async function testNotificationsV2() {
  await assertAdmin()
  notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_REQUESTED, {
    media: {
      tmdbId: 'test',
      mediaType: 'movie',
      title: 'Test Notification V2',
      year: new Date().getFullYear(),
      overview: "Ceci est un message de test envoyé par NotificationsV2.",
      genres: 'Test',
      rating: '10.0',
    },
    requester: {
      id: 0,
      name: 'Admin',
    },
  })
  return { success: true, message: 'Événement de test émis.' }
}
