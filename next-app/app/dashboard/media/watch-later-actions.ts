'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


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
        log('[WatchLater] Toggling:', params.title, params.mediaId);
        const user = await getCurrentUser()
        if (!user || !(user as any).id) {
            error('[WatchLater] Unauthorized');
            return { success: false, error: 'Vous devez être connecté pour faire cela.' }
        }

        const userId = parseInt((user as any).id)
        
        // Verify if user exists in DB before creating relation (in case of DB reset)
        const userExists = await prisma.user.findUnique({ 
            where: { id: userId } 
        });
        if (!userExists) {
             error('[WatchLater] User not found in DB:', userId);
             return { success: false, error: 'Session invalide. Veuillez vous déconnecter et vous reconnecter.' }
        }

        // Find if it exists either by mediaId OR tmdbId (if provided)
        const existing = await prisma.watchLater.findFirst({
            where: {
                userId,
                mediaType: params.mediaType,
                OR: [
                    { mediaId: params.mediaId },
                    { tmdbId: params.mediaId },
                    ...(params.tmdbId ? [
                        { mediaId: params.tmdbId },
                        { tmdbId: params.tmdbId }
                    ] : [])
                ]
            }
        })

        if (existing) {
            log('[WatchLater] Removing item:', existing.id);
            await prisma.watchLater.delete({
                where: { id: existing.id }
            })

            const { logAction } = await import('@/lib/audit')
            await logAction(userId, 'WATCH_LATER_REMOVE', 'WatchLater', existing.id.toString(), { title: params.title, mediaType: params.mediaType, mediaId: params.mediaId })

            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'removed' }
        } else {
            log('[WatchLater] Adding item:', params.title);
            const newItem = await prisma.watchLater.create({
                data: {
                    userId,
                    mediaId: params.mediaId,
                    tmdbId: params.tmdbId,
                    mediaType: params.mediaType,
                    title: params.title,
                    posterPath: params.posterPath,
                    isEmbyItem: params.isEmbyItem
                }
            })

            const { logAction } = await import('@/lib/audit')
            await logAction(userId, 'WATCH_LATER_ADD', 'WatchLater', newItem.id.toString(), { title: params.title, mediaType: params.mediaType, mediaId: params.mediaId })

            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'added' }
        }
    } catch (e) {
        error('Failed to toggle watch later:', e)
        return { success: false, error: 'Erreur interne du serveur' }
    }
}


export async function getWatchLaterList() {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return []

        const userId = parseInt((user as any).id)

        const items = await prisma.watchLater.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return items
    } catch (e) {
        error('Failed to get watch later list:', e)
        return []
    }
}

export async function isInWatchLater(mediaId: string, mediaType: string): Promise<boolean> {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return false

        const userId = parseInt((user as any).id)
        
        const existing = await prisma.watchLater.findFirst({
            where: {
                userId,
                mediaType,
                OR: [
                    { mediaId },
                    { tmdbId: mediaId }
                ]
            }
        })
        
        return !!existing
    } catch (e) {
        error('Failed to check if in watch later:', e)
        return false
    }
}

export async function areInWatchLater(items: { id: string, mediaType: string }[]) {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return []

        const userId = parseInt((user as any).id)
        
        if (!items || items.length === 0) return []

        const ids = items.map(i => i.id)
        
        const matches = await prisma.watchLater.findMany({
            where: {
                userId,
                OR: [
                    { mediaId: { in: ids } },
                    { tmdbId: { in: ids } }
                ]
            }
        })
        
        const result: string[] = []
        for (const match of matches) {
             result.push(`${match.mediaType}:${match.mediaId}`)
             if (match.tmdbId) {
                 result.push(`${match.mediaType}:${match.tmdbId}`)
             }
        }
        
        return result
    } catch (e) {
        error('Failed to check watch later status:', e)
        return []
    }
}
