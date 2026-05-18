'use server'

import { db } from "@/lib/db/drizzle"
import { users, watchLater } from "@/lib/db/schema"
import { eq, and, or, inArray, desc, sql } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logger } from '@/lib/logger'


export interface WatchLaterItem {
    id: number
    mediaId: string
    tmdbId?: string | null
    mediaType: string
    title: string
    posterPath?: string | null
    isEmbyItem: boolean
    createdAt: Date
}

export async function toggleWatchLater(params: {
    mediaId: string
    tmdbId?: string
    mediaType: 'movie' | 'tv'
    title: string
    posterPath?: string | null
    isEmbyItem: boolean
}) {
    try {
        logger.info('[WatchLater] Toggling:', params.title, params.mediaId);
        const user = await getCurrentUser()
        if (!user || !user?.id) {
            logger.error('[WatchLater] Unauthorized');
            return { success: false, error: 'Vous devez être connecté pour faire cela.' }
        }

        const userId = parseInt(user.id)
        
        // Verify if user exists in DB before creating relation (in case of DB reset)
        const [userExists] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
        if (!userExists) {
             logger.error('[WatchLater] User not found in DB:', userId);
             return { success: false, error: 'Session invalide. Veuillez vous déconnecter et vous reconnecter.' }
        }

        // Find if it exists either by mediaId OR tmdbId (if provided)
        // Build OR conditions for mediaId/tmdbId matching
        const mediaConditions = [eq(watchLater.mediaId, params.mediaId), eq(watchLater.tmdbId, params.mediaId)]
        if (params.tmdbId) {
            mediaConditions.push(eq(watchLater.mediaId, params.tmdbId))
            mediaConditions.push(eq(watchLater.tmdbId, params.tmdbId))
        }
        
        const [existing] = await db.select().from(watchLater).where(
            and(
                eq(watchLater.userId, userId),
                eq(watchLater.mediaType, params.mediaType),
                or(...mediaConditions)
            )
        ).limit(1)

        if (existing) {
            logger.info('[WatchLater] Removing item:', existing.id);
            await db.delete(watchLater).where(eq(watchLater.id, existing.id))

            const { logAction } = await import('@/lib/audit')
            await logAction(userId, 'WATCH_LATER_REMOVE', 'WatchLater', existing.id.toString(), { title: params.title, mediaType: params.mediaType, mediaId: params.mediaId })

            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'removed' }
        } else {
            logger.info('[WatchLater] Adding item:', params.title);
            const [newItem] = await db.insert(watchLater).values({
                userId,
                mediaId: params.mediaId,
                tmdbId: params.tmdbId || null,
                mediaType: params.mediaType,
                title: params.title,
                posterPath: params.posterPath || null,
                isEmbyItem: params.isEmbyItem
            }).returning()

            const { logAction } = await import('@/lib/audit')
            await logAction(userId, 'WATCH_LATER_ADD', 'WatchLater', newItem.id.toString(), { title: params.title, mediaType: params.mediaType, mediaId: params.mediaId })

            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'added' }
        }
    } catch (e) {
        logger.error('Failed to toggle watch later:', e)
        return { success: false, error: 'Erreur interne du serveur' }
    }
}


export async function getWatchLaterList() {
    try {
        const user = await getCurrentUser()
        if (!user || !user?.id) return []

        const userId = parseInt(user.id)

        const items = await db.select().from(watchLater).where(eq(watchLater.userId, userId)).orderBy(desc(watchLater.createdAt))

        return items
    } catch (e) {
        logger.error('Failed to get watch later list:', e)
        return []
    }
}

export async function isInWatchLater(mediaId: string, mediaType: string): Promise<boolean> {
    try {
        const user = await getCurrentUser()
        if (!user || !user?.id) return false

        const userId = parseInt(user.id)
        
        const [existing] = await db.select().from(watchLater).where(
            and(
                eq(watchLater.userId, userId),
                eq(watchLater.mediaType, mediaType),
                or(eq(watchLater.mediaId, mediaId), eq(watchLater.tmdbId, mediaId))
            )
        ).limit(1)
        
        return !!existing
    } catch (e) {
        logger.error('Failed to check if in watch later:', e)
        return false
    }
}

export async function areInWatchLater(items: { id: string, mediaType: string }[]) {
    try {
        const user = await getCurrentUser()
        if (!user || !user?.id) return []

        const userId = parseInt(user.id)
        
        if (!items || items.length === 0) return []

        const ids = items.map(i => i.id)
        
        const matches = await db.select().from(watchLater).where(
            and(
                eq(watchLater.userId, userId),
                or(inArray(watchLater.mediaId, ids), inArray(watchLater.tmdbId, ids))
            )
        )
        
        const result: string[] = []
        for (const match of matches) {
             result.push(`${match.mediaType}:${match.mediaId}`)
             if (match.tmdbId) {
                 result.push(`${match.mediaType}:${match.tmdbId}`)
             }
        }
        
        return result
    } catch (e) {
        logger.error('Failed to check watch later status:', e)
        return []
    }
}
