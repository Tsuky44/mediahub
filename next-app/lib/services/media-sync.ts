import { prisma } from '@/lib/prisma';
import { getMediaAvailability } from '@/lib/services/media-status';
import { NotificationService } from '@/lib/services/notification-service';

export class MediaSyncService {
    private static isRunning = false;
    private static interval: NodeJS.Timeout | null = null;
    private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

    static initBackgroundSync() {
        if (this.interval) return;

        console.log('[MediaSync] Initializing background media sync (every 5m)...');
        
        // Run immediately
        this.syncAvailability();

        this.interval = setInterval(() => {
            this.syncAvailability();
        }, this.SYNC_INTERVAL);
    }

    static async syncAvailability() {
        if (this.isRunning) {
            console.log('[MediaSync] Sync already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('[MediaSync] Starting availability sync...');

        try {
            // 1. Get all pending requests and active subscriptions
            // We want to check anything that users are interested in
            const requests = await prisma.mediaRequest.findMany({
                where: {
                    status: { not: 5 } // Not already AVAILABLE
                },
                select: { tmdbId: true, mediaType: true }
            });

            const subscriptions = await prisma.mediaSubscription.findMany({
                select: { tmdbId: true, mediaType: true }
            });

            // 2. Create a unique set of items to check
            const itemsToCheck = new Map<string, { tmdbId: string, mediaType: 'movie' | 'tv' }>();
            
            [...requests, ...subscriptions].forEach(item => {
                const key = `${item.mediaType}-${item.tmdbId}`;
                itemsToCheck.set(key, { 
                    tmdbId: item.tmdbId, 
                    mediaType: item.mediaType as 'movie' | 'tv' 
                });
            });

            console.log(`[MediaSync] Found ${itemsToCheck.size} unique items to check.`);

            // 3. Check availability for each item
            // We process sequentially to avoid overwhelming Radarr/Sonarr
            for (const item of Array.from(itemsToCheck.values())) {
                await this.checkItem(item.tmdbId, item.mediaType);
            }

        } catch (error) {
            console.error('[MediaSync] Error during sync:', error);
        } finally {
            this.isRunning = false;
            console.log('[MediaSync] Sync completed.');
        }
    }

    private static async checkItem(tmdbId: string, mediaType: 'movie' | 'tv') {
        try {
            const tmdbIdNum = parseInt(tmdbId);
            if (isNaN(tmdbIdNum)) return;

            // Force refresh to get latest data from *arr
            const availability = await getMediaAvailability(tmdbIdNum, mediaType, true);
            
            const isAvailable = availability.status === 'available';
            const isPartial = availability.status === 'partial'; // Relevant for TV

            // Get previous state from index
            const index = await prisma.mediaAvailabilityIndex.findUnique({
                where: {
                    tmdbId_mediaType: {
                        tmdbId: tmdbId,
                        mediaType: mediaType
                    }
                }
            });

            const wasAvailable = index?.isAvailable || false;
            // We can also store 'partial' state logic if we want, but 'isAvailable' boolean in DB might be limiting.
            // However, let's assume 'isAvailable' true means FULLY available.
            
            // Check if status changed to AVAILABLE
            if (!wasAvailable && isAvailable) {
                console.log(`[MediaSync] Item became available: ${mediaType}/${tmdbId}`);
                
                // 1. Update Index
                await prisma.mediaAvailabilityIndex.upsert({
                    where: { tmdbId_mediaType: { tmdbId, mediaType } },
                    create: {
                        tmdbId,
                        mediaType,
                        isAvailable: true,
                        availabilityData: JSON.stringify(availability),
                        lastCheckedAt: new Date()
                    },
                    update: {
                        isAvailable: true,
                        availabilityData: JSON.stringify(availability),
                        lastCheckedAt: new Date()
                    }
                });

                // 2. Update Requests
                await prisma.mediaRequest.updateMany({
                    where: {
                        tmdbId: tmdbId,
                        mediaType: mediaType,
                        status: { not: 5 }
                    },
                    data: { status: 5 } // Mark as AVAILABLE
                });

                // 3. Notify Users
                await this.notifyUsers(tmdbId, mediaType, availability);
            } 
            // Update index even if not available, to keep data fresh
            else {
                await prisma.mediaAvailabilityIndex.upsert({
                    where: { tmdbId_mediaType: { tmdbId, mediaType } },
                    create: {
                        tmdbId,
                        mediaType,
                        isAvailable: isAvailable,
                        availabilityData: JSON.stringify(availability),
                        lastCheckedAt: new Date()
                    },
                    update: {
                        isAvailable: isAvailable,
                        availabilityData: JSON.stringify(availability),
                        lastCheckedAt: new Date()
                    }
                });
            }

        } catch (error) {
            console.error(`[MediaSync] Failed to check item ${mediaType}/${tmdbId}:`, error);
        }
    }

    private static async notifyUsers(tmdbId: string, mediaType: 'movie' | 'tv', availability: any) {
        // Find Requesters
        const requests = await prisma.mediaRequest.findMany({
            where: { tmdbId, mediaType },
            include: { user: true }
        });

        // Find Subscribers
        const subscriptions = await prisma.mediaSubscription.findMany({
            where: { tmdbId, mediaType },
            include: { user: true }
        });

        const notifiedUserIds = new Set<number>();
        const title = availability.details?.title || 'Média disponible';

        // Check for existing notifications in the last 1 hour to prevent duplicates
        // This handles race conditions between Webhook and Sync
        const recentNotifications = await prisma.notification.findMany({
            where: {
                mediaId: tmdbId,
                mediaType: mediaType,
                type: { in: ['request_available', 'media_available'] },
                createdAt: {
                    gte: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
                }
            },
            select: { userId: true }
        });

        recentNotifications.forEach(n => notifiedUserIds.add(n.userId));

        // Notify Requesters
        for (const req of requests) {
            if (!req.user) continue;
            if (notifiedUserIds.has(req.user.id)) continue;
            
            await NotificationService.notifyUser(
                req.user.id,
                'Votre demande est disponible',
                `Le film/série "${title}" que vous avez demandé est maintenant disponible.`,
                'request_available',
                { mediaId: tmdbId, mediaType, posterPath: undefined }
            );
            notifiedUserIds.add(req.user.id);
        }

        // Notify Subscribers
        for (const sub of subscriptions) {
            if (!sub.user) continue;
            if (notifiedUserIds.has(sub.user.id)) continue;

            await NotificationService.notifyUser(
                sub.user.id,
                'Nouveau contenu disponible',
                `"${title}" est maintenant disponible dans votre médiathèque.`,
                'media_available',
                { mediaId: tmdbId, mediaType, posterPath: undefined }
            );
            notifiedUserIds.add(sub.user.id);
        }
    }
}
