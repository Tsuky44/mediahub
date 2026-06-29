import { db } from '@/lib/db/drizzle'
import { notifications, users, roles, permissions } from '@/lib/db/schema'
import { eq, desc, and, or } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import type { MediaInfo } from '@/lib/notifications-v2/types'

export type InternalNotificationType = 'media_available' | 'new_ticket' | 'system_update'

interface CreateNotificationInput {
  userId: number
  title: string
  message: string
  type: InternalNotificationType
  mediaId?: string
  mediaType?: string
  posterPath?: string
  link?: string
  data?: Record<string, unknown>
}

export async function createInternalNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      mediaId: input.mediaId ?? null,
      mediaType: input.mediaType ?? null,
      posterPath: input.posterPath ?? null,
      link: input.link ?? null,
      data: input.data ? JSON.stringify(input.data) : null,
    })
  } catch (err) {
    logger.error('[InternalNotifications] Failed to create notification:', err)
  }
}

export async function createMediaAvailableNotification(
  media: MediaInfo,
  requesterUserId?: number
): Promise<void> {
  try {
    // 1. Récupérer tous les utilisateurs qui veulent recevoir TOUTES les disponibilités de médias
    const allMediaReceivers = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(permissions, eq(roles.id, permissions.roleId))
      .where(
        or(
          eq(users.role, 'admin'),
          and(
            eq(permissions.subject, 'Notification'),
            eq(permissions.action, 'read_all_media_available')
          )
        )
      )

    // 2. Construire la liste des IDs uniques à notifier
    const userIdsToNotify = new Set<number>(allMediaReceivers.map(u => u.id))

    // 3. Vérifier le demandeur spécifique (si fourni)
    if (requesterUserId) {
      const requesterUser = await db.query.users.findFirst({
        where: eq(users.id, requesterUserId),
        with: { roleRef: { with: { permissions: true } } }
      })

      if (requesterUser) {
        const isRequesterAdmin = requesterUser.role === 'admin'
        
        // Si l'utilisateur n'a pas de rôle spécifique assigné (ou rôle par défaut), on lui permet par défaut
        let hasOwnPermission = true
        if (requesterUser.roleRef?.permissions) {
          hasOwnPermission = requesterUser.roleRef.permissions.some(
            p => p.subject === 'Notification' && p.action === 'read_own_media_available'
          )
        }

        if (isRequesterAdmin || hasOwnPermission) {
          userIdsToNotify.add(requesterUserId)
        }
      }
    }

    const title = media.mediaType === 'tv'
      ? `📺 ${media.title} est disponible !`
      : `🍿 ${media.title} est disponible !`

    const message = media.mediaType === 'tv'
      ? `La série "${media.title}" est maintenant disponible sur le serveur.`
      : `Le film "${media.title}" est maintenant disponible sur le serveur.`

    for (const targetUserId of userIdsToNotify) {
      await createInternalNotification({
        userId: targetUserId,
        title,
        message,
        type: 'media_available',
        mediaId: media.tmdbId,
        mediaType: media.mediaType,
        posterPath: media.posterPath,
        link: `/dashboard/media/${media.tmdbId}?type=${media.mediaType}`,
        data: { seasonNumber: media.seasonNumber },
      })
    }
  } catch (err) {
    logger.error('[InternalNotifications] Failed to process media available notification:', err)
  }
}

export async function createTicketNotification(
  ticketId: string,
  categoryName: string,
  userName: string | null
): Promise<void> {
  try {
    // Récupérer les admins et les rôles ayant la permission d'être notifiés de nouveaux tickets
    const managers = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(permissions, eq(roles.id, permissions.roleId))
      .where(
        or(
          eq(users.role, 'admin'),
          and(
            eq(permissions.subject, 'Notification'),
            eq(permissions.action, 'read_new_ticket')
          )
        )
      )

    const title = `🎫 Nouveau ticket de support`
    const message = `${userName ?? 'Un utilisateur'} a ouvert un ticket dans "${categoryName}".`

    const userIds = new Set<number>(managers.map(u => u.id))

    for (const targetUserId of userIds) {
      await createInternalNotification({
        userId: targetUserId,
        title,
        message,
        type: 'new_ticket',
        link: `/dashboard/settings?tab=support`,
        data: { ticketId },
      })
    }
  } catch (err) {
    logger.error('[InternalNotifications] Failed to process ticket notification:', err)
  }
}

export async function createUpdateNotification(latestVersion: string): Promise<void> {
  try {
    // Récupérer les admins et les rôles ayant la permission de voir les notifications de mise à jour système
    const managers = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(permissions, eq(roles.id, permissions.roleId))
      .where(
        or(
          eq(users.role, 'admin'),
          and(
            eq(permissions.subject, 'Notification'),
            eq(permissions.action, 'read_system_update')
          )
        )
      )

    const title = `🚀 Mise à jour disponible`
    const message = `La version ${latestVersion} est disponible. Pensez à mettre à jour l'application.`

    const userIds = new Set<number>(managers.map(u => u.id))

    for (const targetUserId of userIds) {
      await createInternalNotification({
        userId: targetUserId,
        title,
        message,
        type: 'system_update',
        link: `/dashboard/settings?tab=maintenance`,
        data: { version: latestVersion },
      })
    }
  } catch (err) {
    logger.error('[InternalNotifications] Failed to process update notification:', err)
  }
}

export async function clearUpdateNotifications(): Promise<void> {
  try {
    await db.delete(notifications).where(eq(notifications.type, 'system_update'))
  } catch (err) {
    logger.error('[InternalNotifications] Failed to clear update notifications:', err)
  }
}
