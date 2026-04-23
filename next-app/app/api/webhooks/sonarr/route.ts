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

        if (eventType === 'Grab' || eventType === 'SeriesDelete' || eventType === 'EpisodeDelete') {
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
            const usersToNotify = new Map<number, { id: number, name: string, email: string, discordUserId?: string | null }>();
            
            requests.forEach(req => {
                if (req.user) {
                    usersToNotify.set(req.user.id, {
                        id: req.user.id,
                        name: req.user.name || '',
                        email: req.user.email || '',
                        discordUserId: req.user.discordUserId
                    });
                    console.log(`[SonarrWebhook] Adding requester: ${req.user.name} (${req.user.id})`);
                }
            });
            
            subscriptions.forEach(sub => {
                usersToNotify.set(sub.user.id, {
                    id: sub.user.id,
                    name: sub.user.name || '',
                    email: sub.user.email || '',
                    discordUserId: sub.user.discordUserId
                });
                console.log(`[SonarrWebhook] Adding subscriber: ${sub.user.name} (${sub.user.id})`);
            });

            if (usersToNotify.size === 0) {
                console.log('[SonarrWebhook] No users to notify');
            } else {
                console.log(`[SonarrWebhook] Sending notifications to ${usersToNotify.size} users`);
            }

            let posterPath = undefined
            let overview = ''
            let rating = ''
            let genres = ''
            let quality = body.episodeFile?.quality || body.release?.quality || 'Inconnu'
            let size = body.episodeFile?.size ? (body.episodeFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : (body.release?.size ? (body.release.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : 'Inconnu')
            let release = body.episodeFile?.releaseGroup || body.release?.releaseTitle || 'Inconnu'
            let indexer = body.episodeFile?.indexerFlags || body.release?.indexer || 'Inconnu'

            try {
                if (tmdbId && tmdbService) {
                    const mediaInfo = await tmdbService.getDetails(parseInt(tmdbId), 'tv')
                    if (mediaInfo) {
                        posterPath = mediaInfo.poster_path
                        overview = mediaInfo.overview
                        rating = mediaInfo.vote_average?.toFixed(1)
                        if (mediaInfo.genres) {
                            genres = mediaInfo.genres.map((g: any) => g.name).join(', ')
                        }
                    }
                }
            } catch (e) {}

            // Map Sonarr events to MediaHub events
            let mhEvent = 'media_grabbed';
            let titlePrefix = 'Épisode en cours de téléchargement';
            let userTitlePrefix = 'Ton épisode est en cours de téléchargement';
            let messageText = `Un épisode de "${title}" a été trouvé et est en cours de téléchargement : ${episodeText}`;
            let userMessageText = `Un épisode de "${title}" que tu as demandé a été trouvé et est en cours de téléchargement : ${episodeText}`;

            // Store hash→tmdbId mapping at Grab time for download completion detection
            if (eventType === 'Grab' && body.downloadId && tmdbId) {
                try {
                    const mapSetting = await prisma.setting.findFirst({ where: { key: 'download_hash_map' } })
                    const hashMap: Record<string, any> = mapSetting ? JSON.parse(mapSetting.value || '{}') : {}
                    hashMap[body.downloadId.toLowerCase()] = { tmdbId, mediaType: 'tv', title }
                    const trimmedKeys = Object.keys(hashMap).slice(-200)
                    const trimmedMap = Object.fromEntries(trimmedKeys.map(k => [k, hashMap[k]]))
                    await prisma.setting.upsert({
                        where: { key: 'download_hash_map' },
                        update: { value: JSON.stringify(trimmedMap) },
                        create: { key: 'download_hash_map', value: JSON.stringify(trimmedMap) }
                    })
                    console.log(`[SonarrWebhook] Stored hash mapping: ${body.downloadId} → TMDB ${tmdbId}`)
                } catch (e) {
                    console.error('[SonarrWebhook] Failed to store hash mapping:', e)
                }
            }

            if (eventType === 'SeriesDelete' || eventType === 'EpisodeDelete') {
                mhEvent = 'media_deleted';
                titlePrefix = eventType === 'SeriesDelete' ? 'Série supprimée' : 'Épisode supprimé';
                userTitlePrefix = titlePrefix;
                messageText = eventType === 'SeriesDelete' 
                    ? `La série "${title}" a été supprimée du serveur.`
                    : `L'épisode de "${title}" a été supprimé du serveur : ${episodeText}`;
                userMessageText = messageText;
            }

            // 4. Send internal notifications (only for availability)
            if (mhEvent === 'media_available') {
                const notifyPromises = Array.from(usersToNotify.values()).map(async (user) => {
                    await NotificationService.notifyUser(
                        user.id,
                        'Épisode disponible',
                        `Nouvel épisode de "${title}" disponible : ${episodeText}`,
                        'media_available',
                        {
                            mediaId: tmdbId!,
                            mediaType: 'tv',
                            posterPath: posterPath,
                            link: `/dashboard/media/${tmdbId}?type=tv`
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
                await ExternalNotificationService.send(mhEvent as any, {
                    title: titlePrefix,
                    message: messageText,
                    data: {
                        tmdbId,
                        mediaType: 'tv',
                        title,
                        episodes: episodeText,
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
                console.error('[SonarrWebhook] Failed to send external notification:', extError)
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[SonarrWebhook] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
