import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { eventType, movie } = body;

        console.log(`[RadarrWebhook] Received event: ${eventType}`);
        if (movie) {
            console.log(`[RadarrWebhook] Movie data: Title="${movie.title}", TMDB="${movie.tmdbId}", Year="${movie.year}"`);
        } else {
            console.warn('[RadarrWebhook] No movie object in payload');
        }

        if (eventType === 'Download' || eventType === 'Import') {
            if (!movie?.tmdbId) {
                console.error('[RadarrWebhook] Missing TMDB ID in movie object');
                return NextResponse.json({ success: true });
            }

            const tmdbId = String(movie.tmdbId);
            const title = movie.title;
            const year = movie.year;

            console.log(`[RadarrWebhook] Processing availability for TMDB ID: ${tmdbId} (Type: ${typeof tmdbId})`);

            // 1. Find requesters
            const requests = await prisma.mediaRequest.findMany({
                where: {
                    tmdbId: tmdbId,
                    mediaType: 'movie',
                    // status: { in: [1, 2] } // Pending or Processing
                },
                include: { user: true }
            });
            console.log(`[RadarrWebhook] Found ${requests.length} requests for TMDB ${tmdbId}`);

            // 2. Find subscribers
            const subscriptions = await prisma.mediaSubscription.findMany({
                where: {
                    tmdbId: tmdbId,
                    mediaType: 'movie'
                },
                include: { user: true }
            });
            console.log(`[RadarrWebhook] Found ${subscriptions.length} subscriptions for TMDB ${tmdbId}`);

            if (requests.length === 0 && subscriptions.length === 0) {
                console.warn(`[RadarrWebhook] No active requests or subscriptions found for TMDB ID: ${tmdbId}`);
                // Debug: check if there are any requests with this ID but different type or status?
                // Or maybe the ID is stored differently?
            }

            // 3. Merge users
            const usersToNotify = new Map<number, { id: number, name: string }>();
            
            requests.forEach(req => {
                if (req.user) {
                    usersToNotify.set(req.user.id, req.user);
                    console.log(`[RadarrWebhook] Adding requester: ${req.user.name} (${req.user.id})`);
                }
            });
            
            subscriptions.forEach(sub => {
                usersToNotify.set(sub.user.id, sub.user);
                console.log(`[RadarrWebhook] Adding subscriber: ${sub.user.name} (${sub.user.id})`);
            });

            if (usersToNotify.size === 0) {
                console.log('[RadarrWebhook] No users to notify');
            } else {
                console.log(`[RadarrWebhook] Sending notifications to ${usersToNotify.size} users`);
            }

            // 4. Send notifications
            const notifyPromises = Array.from(usersToNotify.values()).map(async (user) => {
                await NotificationService.notifyUser(
                    user.id,
                    'Film disponible',
                    `Le film "${title}" (${year}) est maintenant disponible !`,
                    'media_available',
                    {
                        mediaId: tmdbId,
                        mediaType: 'movie',
                        posterPath: undefined, // We could fetch this from TMDB if needed
                        link: `/dashboard/media/${tmdbId}?type=movie`
                    }
                );
            });

            await Promise.all(notifyPromises);

            // Update request status if needed? 
            // Currently handled by other sync processes probably.
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[RadarrWebhook] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
