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

        if (eventType === 'Grab' || eventType === 'MovieDelete') {
            if (!movie?.tmdbId) {
                console.error('[RadarrWebhook] Missing TMDB ID in movie object');
                return NextResponse.json({ success: true });
            }

            const tmdbId = String(movie.tmdbId);
            const title = movie.title;
            const year = movie.year;

            console.log(`[RadarrWebhook] Processing event ${eventType} for TMDB ID: ${tmdbId}`);

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
            const usersToNotify = new Map<number, { id: number, name: string, email: string, discordUserId?: string | null }>();
            
            requests.forEach(req => {
                if (req.user) {
                    usersToNotify.set(req.user.id, {
                        id: req.user.id,
                        name: req.user.name || '',
                        email: req.user.email || '',
                        discordUserId: req.user.discordUserId
                    });
                    console.log(`[RadarrWebhook] Adding requester: ${req.user.name} (${req.user.id})`);
                }
            });
            
            subscriptions.forEach(sub => {
                usersToNotify.set(sub.user.id, {
                    id: sub.user.id,
                    name: sub.user.name || '',
                    email: sub.user.email || '',
                    discordUserId: sub.user.discordUserId
                });
                console.log(`[RadarrWebhook] Adding subscriber: ${sub.user.name} (${sub.user.id})`);
            });

            if (usersToNotify.size === 0) {
                console.log('[RadarrWebhook] No users to notify');
            } else {
                console.log(`[RadarrWebhook] Sending notifications to ${usersToNotify.size} users`);
            }

            const getTmdbService = await import('@/lib/services/tmdb').then(m => m.getTmdbService)
            const tmdbService = await getTmdbService()
            let posterPath = undefined
            let overview = ''
            let rating = ''
            let genres = ''
            let quality = body.movieFile?.quality || body.release?.quality || 'Inconnu'
            let size = body.movieFile?.size ? (body.movieFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : (body.release?.size ? (body.release.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'Inconnu')
            let release = body.movieFile?.releaseGroup || body.release?.releaseTitle || 'Inconnu'
            let indexer = body.movieFile?.indexerFlags || body.release?.indexer || 'Inconnu'

            try {
                if (tmdbId && tmdbService) {
                    const mediaInfo = await tmdbService.getDetails(parseInt(tmdbId), 'movie')
                    if (mediaInfo) {
                        posterPath = mediaInfo.poster_path
                        overview = mediaInfo.overview
                        rating = mediaInfo.vote_average?.toFixed(1)
                        if (mediaInfo.genres) {
                            genres = mediaInfo.genres.map((g: Record<string, unknown>) => g.name as string).join(', ')
                        }
                    }
                }
            } catch (e) {}

            // Map Radarr events to MediaHub events
            let mhEvent = 'media_grabbed';
            let titlePrefix = 'Film en cours de téléchargement';
            let userTitlePrefix = 'Ton film est en cours de téléchargement';
            let messageText = `Le film "${title}" (${year || ''}) a été trouvé et est en cours de téléchargement.`;
            let userMessageText = `Le film "${title}" (${year || ''}) que tu as demandé a été trouvé et est en cours de téléchargement.`;

            // Store hash→tmdbId mapping at Grab time for download completion detection
            if (eventType === 'Grab' && body.downloadId) {
                try {
                    const mapSetting = await prisma.setting.findFirst({ where: { key: 'download_hash_map' } })
                    const hashMap: Record<string, any> = mapSetting ? JSON.parse(mapSetting.value || '{}') : {}
                    hashMap[body.downloadId.toLowerCase()] = { tmdbId, mediaType: 'movie', title }
                    const trimmedKeys = Object.keys(hashMap).slice(-200)
                    const trimmedMap = Object.fromEntries(trimmedKeys.map(k => [k, hashMap[k]]))
                    await prisma.setting.upsert({
                        where: { key: 'download_hash_map' },
                        update: { value: JSON.stringify(trimmedMap) },
                        create: { key: 'download_hash_map', value: JSON.stringify(trimmedMap) }
                    })
                    console.log(`[RadarrWebhook] Stored hash mapping: ${body.downloadId} → TMDB ${tmdbId}`)
                } catch (e) {
                    console.error('[RadarrWebhook] Failed to store hash mapping:', e)
                }
            }

            if (eventType === 'MovieDelete') {
                mhEvent = 'media_deleted';
                titlePrefix = 'Film supprimé';
                userTitlePrefix = 'Film supprimé';
                messageText = `Le film "${title}" (${year || ''}) a été supprimé du serveur.`;
                userMessageText = `Le film "${title}" (${year || ''}) a été supprimé du serveur.`;
            }

            // 4. Send internal notifications (only for availability)
            if (mhEvent === 'media_available') {
                const notifyPromises = Array.from(usersToNotify.values()).map(async (user) => {
                    await NotificationService.notifyUser(
                        user.id,
                        'Film disponible',
                        `Le film "${title}" (${year}) est maintenant disponible !`,
                        'media_available',
                        {
                            mediaId: tmdbId,
                            mediaType: 'movie',
                            posterPath: posterPath,
                            link: `/dashboard/media/${tmdbId}?type=movie`
                        }
                    );
                });
                await Promise.all(notifyPromises);
            }

            // Collect requesters for global notification
            const requestersList = Array.from(usersToNotify.values())
                .map(u => u.discordUserId ? `<@${u.discordUserId}>` : (u.name || u.email))
                .join(', ')

            // Send global notifications for all events, passing the requester ID if there's exactly one
            const requesterId = usersToNotify.size === 1 ? Array.from(usersToNotify.values())[0].id : undefined;

            try {
                const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
                await ExternalNotificationService.send(mhEvent, {
                    title: titlePrefix,
                    message: messageText,
                    data: {
                        tmdbId,
                        mediaType: 'movie',
                        title,
                        year,
                        overview,
                        rating,
                        posterPath,
                        genres,
                        quality,
                        size,
                        release,
                        indexer,
                        user: requestersList || undefined
                    }
                }, requesterId)
            } catch (extError) {
                console.error('[RadarrWebhook] Failed to send external notification:', extError)
            }

            // Update request status if needed? 
            // Currently handled by other sync processes probably.
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[RadarrWebhook] Error:', (error as Error).message);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
