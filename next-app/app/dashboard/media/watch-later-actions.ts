'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

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
        console.log('[WatchLater] Toggling:', params.title, params.mediaId);
        const user = await getCurrentUser()
        if (!user || !(user as any).id) {
            console.error('[WatchLater] Unauthorized');
            return { success: false, error: 'Vous devez être connecté pour faire cela.' }
        }

        const userId = parseInt((user as any).id)
        const instanceId = parseInt((user as any).instanceId)
        
        // Verify if user exists in DB before creating relation (in case of DB reset)
        const userExists = await (prisma as any).user.findFirst({ 
            where: { id: userId, instanceId } 
        });
        if (!userExists) {
             console.error('[WatchLater] User not found in DB:', userId);
             return { success: false, error: 'Session invalide. Veuillez vous déconnecter et vous reconnecter.' }
        }

        // Find if it exists either by mediaId OR tmdbId (if provided)
        const existing = await (prisma as any).watchLater.findFirst({
            where: {
                userId,
                instanceId,
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
            console.log('[WatchLater] Removing item:', existing.id);
            await (prisma as any).watchLater.delete({
                where: { id: existing.id }
            })
            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'removed' }
        } else {
            console.log('[WatchLater] Adding item:', params.title);
            await (prisma as any).watchLater.create({
                data: {
                    userId,
                    instanceId,
                    mediaId: params.mediaId,
                    tmdbId: params.tmdbId,
                    mediaType: params.mediaType,
                    title: params.title,
                    posterPath: params.posterPath,
                    isEmbyItem: params.isEmbyItem
                }
            })
            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'added' }
        }
    } catch (error) {
        console.error('Failed to toggle watch later:', error)
        return { success: false, error: 'Erreur interne du serveur' }
    }
}


export async function getWatchLaterList() {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return []

        const userId = parseInt((user as any).id)
        const instanceId = parseInt((user as any).instanceId)

        const items = await (prisma as any).watchLater.findMany({
            where: { userId, instanceId },
            orderBy: { createdAt: 'desc' }
        })

        return items as WatchLaterItem[]
    } catch (error) {
        console.error('Failed to get watch later list:', error)
        return []
    }
}

export async function areInWatchLater(items: { id: string, mediaType: string }[]) {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return []

        const userId = parseInt((user as any).id)
        const instanceId = parseInt((user as any).instanceId)

        const ids = items.map(i => i.id)
        
        const existing = await (prisma as any).watchLater.findMany({
            where: {
                userId,
                instanceId,
                OR: [
                    { mediaId: { in: ids } },
                    { tmdbId: { in: ids } }
                ]
            },
            select: { mediaId: true, tmdbId: true, mediaType: true }
        })

        // Return an array of keys "mediaType:id" that are in watch later
        return existing.map((item: any) => `${item.mediaType}:${item.tmdbId || item.mediaId}`)
    } catch (error) {
        console.error('Failed to check watch later status batch:', error)
        return []
    }
}

export async function isInWatchLater(id: string, mediaType: string) {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return false

        const userId = parseInt((user as any).id)
        const instanceId = parseInt((user as any).instanceId)

        const existing = await (prisma as any).watchLater.findFirst({
            where: {
                userId,
                instanceId,
                mediaType,
                OR: [
                    { mediaId: id },
                    { tmdbId: id }
                ]
            }
        })

        return !!existing
    } catch (error) {
        console.error('Failed to check watch later status:', error)
        return false
    }
}
