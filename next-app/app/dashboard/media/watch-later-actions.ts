'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { PrismaClient } from "@prisma/client"

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
        
        let watchLaterModel = (prisma as any).watchLater;
        
        // Fallback: If global prisma instance is stale, try creating a fresh client
        if (!watchLaterModel) {
            console.warn('[WatchLater] prisma.watchLater is undefined on global instance. Attempting to create a fresh client...');
            try {
                const freshClient = new PrismaClient();
                watchLaterModel = (freshClient as any).watchLater;
                if (watchLaterModel) {
                    console.log('[WatchLater] Successfully created fresh client with watchLater model.');
                }
            } catch (e) {
                console.error('[WatchLater] Failed to create fresh client:', e);
            }
        }

        if (!watchLaterModel) {
            console.error('[WatchLater] prisma.watchLater is undefined! Available models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
            return { success: false, error: 'La base de données n\'est pas encore prête. Veuillez rafraîchir la page.' }
        }

        // Verify if user exists in DB before creating relation (in case of DB reset)
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
             console.error('[WatchLater] User not found in DB:', userId);
             return { success: false, error: 'Session invalide. Veuillez vous déconnecter et vous reconnecter.' }
        }

        // Find if it exists either by mediaId OR tmdbId (if provided)
        const existing = await watchLaterModel.findFirst({
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
            console.log('[WatchLater] Removing item:', existing.id);
            await watchLaterModel.delete({
                where: { id: existing.id }
            })
            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'removed' }
        } else {
            console.log('[WatchLater] Adding item:', params.title);
            await watchLaterModel.create({
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
            revalidatePath('/dashboard/requests')
            revalidatePath('/dashboard/media')
            return { success: true, action: 'added' }
        }
    } catch (error) {
        console.error('Failed to toggle watch later:', error)
        return { success: false, error: 'Erreur interne du serveur' }
    }
}

// Remove toggleWithModel as it's no longer needed after simplification


export async function getWatchLaterList() {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return []

        const userId = parseInt((user as any).id)

        let watchLater = (prisma as any).watchLater;
        
        // Fallback
        if (!watchLater) {
             try {
                 const freshClient = new PrismaClient();
                 watchLater = (freshClient as any).watchLater;
             } catch (e) {
                 console.error('[WatchLater] Failed to create fresh client for list:', e);
             }
        }

        if (!watchLater) {
            console.error('[WatchLater] getWatchLaterList: prisma.watchLater is undefined');
            return [];
        }

        const items = await watchLater.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })

        return items as WatchLaterItem[]
    } catch (error) {
        console.error('Failed to get watch later list:', error)
        return []
    }
}

export async function isInWatchLater(id: string, mediaType: string) {
    try {
        const user = await getCurrentUser()
        if (!user || !(user as any).id) return false

        const userId = parseInt((user as any).id)

        let watchLater = (prisma as any).watchLater;
        
        // Fallback
        if (!watchLater) {
             try {
                 const freshClient = new PrismaClient();
                 watchLater = (freshClient as any).watchLater;
             } catch (e) {}
        }

        if (!watchLater) return false;

        const existing = await watchLater.findFirst({
            where: {
                userId,
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
