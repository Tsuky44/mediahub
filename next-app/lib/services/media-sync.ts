import { db } from '@/lib/db/drizzle';
import { mediaRequests, mediaSubscriptions } from '@/lib/db/schema';
import { eq, and, ne, inArray, gte } from 'drizzle-orm';
import { getMediaAvailability } from '@/lib/services/media-status';

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
            const requests = await db.query.mediaRequests.findMany({
                where: ne(mediaRequests.status, 5),
                columns: { tmdbId: true, mediaType: true }
            });

            const subscriptions = await db.query.mediaSubscriptions.findMany({
                columns: { tmdbId: true, mediaType: true }
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

            /* DISABLED: MediaAvailabilityIndex removed from schema
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
            */

            // FALLBACK LOGIC for MediaRequest only (safe without MediaAvailabilityIndex)
            if (isAvailable) {
                 // Check for pending requests
                 const pendingRequests = await db.query.mediaRequests.findMany({
                    where: and(
                        eq(mediaRequests.tmdbId, tmdbId),
                        eq(mediaRequests.mediaType, mediaType),
                        ne(mediaRequests.status, 5)
                    )
                 });

                 if (pendingRequests.length > 0) {
                    console.log(`[MediaSync] Item became available for requests: ${mediaType}/${tmdbId}`);
                    
                    // Update Requests
                    await db.update(mediaRequests)
                        .set({ status: 5, updatedAt: new Date() })
                        .where(and(
                            eq(mediaRequests.tmdbId, tmdbId),
                            eq(mediaRequests.mediaType, mediaType),
                            ne(mediaRequests.status, 5)
                        ));

                    // Notify Users (Requesters + Subscribers)
                    await this.notifyUsers(tmdbId, mediaType, availability);
                 }
            }

        } catch (error) {
            console.error(`[MediaSync] Failed to check item ${mediaType}/${tmdbId}:`, error);
        }
    }

    private static async notifyUsers(tmdbId: string, mediaType: 'movie' | 'tv', availability: any) {
        // Find Requesters
        const requests = await db.query.mediaRequests.findMany({
            where: and(eq(mediaRequests.tmdbId, tmdbId), eq(mediaRequests.mediaType, mediaType)),
            with: { user: true }
        });

        // Find Subscribers
        const subscriptions = await db.query.mediaSubscriptions.findMany({
            where: and(eq(mediaSubscriptions.tmdbId, tmdbId), eq(mediaSubscriptions.mediaType, mediaType)),
            with: { user: true }
        });

        const notifiedUserIds = new Set<number>();
        const title = availability.details?.title || 'Média disponible';

        // V1 notifications supprimées - plus de vérification des notifications récentes
        console.log(`[MediaSync] Skipping recent notification check (V1 notifications removed)`);

        // V1 notifications supprimées - plus de notifications pour les demandeurs
        console.log(`[MediaSync] Would notify ${requests.length} requesters for "${title}" (V1 notifications removed)`);

        for (const req of requests) {
            if (!req.user) continue;
            notifiedUserIds.add(req.user.id);
        }

        // V1 notifications supprimées - plus de notifications pour les abonnés
        console.log(`[MediaSync] Would notify ${subscriptions.length} subscribers for "${title}" (V1 notifications removed)`);
        for (const sub of subscriptions) {
            if (!sub.user) continue;
            notifiedUserIds.add(sub.user.id);
        }
    }
}
