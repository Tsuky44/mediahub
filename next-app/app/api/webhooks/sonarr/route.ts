import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification-service';
import { getTmdbService } from '@/lib/services/tmdb';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { eventType, series, episodes } = body;

        console.log(`[SonarrWebhook] Received event: ${eventType}`);
        if (series) {
            console.log(`[SonarrWebhook] Series data: Title="${series.title}", TVDB="${series.tvdbId}"`);
        } else {
            console.warn('[SonarrWebhook] No series object in payload');
        }

        if (eventType === 'Download' || eventType === 'Import') {
            const tvdbId = series?.tvdbId;
            if (!tvdbId) {
                 console.warn('[SonarrWebhook] No TVDB ID found in payload');
                 return NextResponse.json({ success: true });
            }

            // Convert TVDB ID to TMDB ID
            const tmdbService = await getTmdbService();
            let tmdbId: string | null = null;
            
            if (tmdbService) {
                // Try to find by external ID
                const result = await tmdbService.findByExternalId(tvdbId, 'tvdb_id');
                if (result?.tv_results?.length > 0) {
                    tmdbId = String(result.tv_results[0].id);
                }
            }

            if (!tmdbId) {
                console.warn(`[SonarrWebhook] Could not find TMDB ID for TVDB ID ${tvdbId}`);
                return NextResponse.json({ success: true }); 
            }

            console.log(`[SonarrWebhook] Processing availability for TMDB ID: ${tmdbId} (Type: ${typeof tmdbId})`);

            const title = series.title;
            // Handle multiple episodes if present
            const episodeList = episodes || [];
            const episodeText = episodeList.length > 0 
                ? episodeList.map((ep: any) => `S${ep.seasonNumber}E${ep.episodeNumber}`).join(', ')
                : 'Nouveaux épisodes';

            // 1. Find requesters
            const requests = await prisma.mediaRequest.findMany({
                where: {
                    tmdbId: tmdbId,
                    mediaType: 'tv',
                },
                include: { user: true }
            });
            console.log(`[SonarrWebhook] Found ${requests.length} requests for TMDB ${tmdbId}`);

            // 2. Find subscribers
            const subscriptions = await prisma.mediaSubscription.findMany({
                where: {
                    tmdbId: tmdbId,
                    mediaType: 'tv'
                },
                include: { user: true }
            });
            console.log(`[SonarrWebhook] Found ${subscriptions.length} subscriptions for TMDB ${tmdbId}`);

            if (requests.length === 0 && subscriptions.length === 0) {
                console.warn(`[SonarrWebhook] No active requests or subscriptions found for TMDB ID: ${tmdbId}`);
            }

            // 3. Merge users
            const usersToNotify = new Map<number, { id: number, name: string }>();
            
            requests.forEach(req => {
                if (req.user) {
                    usersToNotify.set(req.user.id, req.user);
                    console.log(`[SonarrWebhook] Adding requester: ${req.user.name} (${req.user.id})`);
                }
            });
            
            subscriptions.forEach(sub => {
                usersToNotify.set(sub.user.id, sub.user);
                console.log(`[SonarrWebhook] Adding subscriber: ${sub.user.name} (${sub.user.id})`);
            });

            if (usersToNotify.size === 0) {
                console.log('[SonarrWebhook] No users to notify');
            } else {
                console.log(`[SonarrWebhook] Sending notifications to ${usersToNotify.size} users`);
            }

            // 4. Send notifications
            const notifyPromises = Array.from(usersToNotify.values()).map(async (user) => {
                await NotificationService.notifyUser(
                    user.id,
                    'Épisode disponible',
                    `Nouvel épisode de "${title}" disponible : ${episodeText}`,
                    'media_available',
                    {
                        mediaId: tmdbId!,
                        mediaType: 'tv',
                        posterPath: undefined, // Will be fetched by service
                        link: `/dashboard/media/${tmdbId}?type=tv`
                    }
                );
            });

            await Promise.all(notifyPromises);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[SonarrWebhook] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
