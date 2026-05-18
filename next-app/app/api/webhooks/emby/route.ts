import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/services/notification-service'
import { getTmdbService } from '@/lib/services/tmdb'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(req: NextRequest) {
  try {
    let payload: any

    // Emby peut envoyer du JSON direct ou du multipart/form-data avec un champ "data"
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const dataStr = formData.get('data') as string
      if (dataStr) {
        payload = JSON.parse(dataStr)
      }
    }

    if (!payload) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 })
    }

    const eventType = payload.Event
    const embyUserId = payload.User?.Id
    const embyUserName = payload.User?.Name
    const item = payload.Item
    const playbackInfo = payload.PlaybackInfo
    const session = payload.Session

    log(`[Webhook] Received event: ${eventType} for ${item?.Name} (User: ${embyUserName})`)

    // ---------------------------------------------------------
    // 1. GESTION DE LA DISPONIBILITÉ (Library.New)
    // ---------------------------------------------------------
    const normalizedEvent = eventType?.toLowerCase() || '';
    if (normalizedEvent === 'library.new' || normalizedEvent === 'item.created' || normalizedEvent === 'item.added') {
        const providerIds = item?.ProviderIds || {};
        // Emby uses mixed casing sometimes
        const tmdbId = providerIds.Tmdb || providerIds.tmdb || providerIds.TMDB;
        const type = item?.Type; // Movie, Episode, Series

        log(`[EmbyWebhook] New item detected: ${item?.Name} (${type}), TMDB: ${tmdbId}`);

        if ((type === 'Movie' || type === 'Episode')) {
            let targetTmdbId = tmdbId ? String(tmdbId) : null;
            let targetMediaType = type === 'Movie' ? 'movie' : 'tv';
            let notificationTitle = 'Média disponible';
            let notificationMessage = `"${item.Name}" est maintenant disponible sur Emby !`;
            
            // Pour les épisodes, il faut récupérer l'ID de la série si possible
            if (type === 'Episode') {
                const seriesTmdbId = item.SeriesProviderIds?.Tmdb || item.SeriesProviderIds?.tmdb || item.SeriesProviderIds?.TMDB;
                
                if (seriesTmdbId) {
                    targetTmdbId = String(seriesTmdbId);
                    notificationTitle = 'Épisode disponible';
                    notificationMessage = `Nouvel épisode de "${item.SeriesName}" disponible : ${item.Name} (S${item.ParentIndexNumber}E${item.IndexNumber})`;
                } else {
                    log(`[EmbyWebhook] Episode detected but no Series TMDB ID found.`);
                    // Fallback: Try to find by TVDB if available, or skip
                    if (!targetTmdbId) {
                        warn(`[EmbyWebhook] Skipping episode notification: No TMDB ID found for Series or Episode`);
                        return NextResponse.json({ success: true });
                    }
                }
            }

            if (!targetTmdbId) {
                warn(`[EmbyWebhook] Skipping notification: No TMDB ID found for ${item.Name}`);
                return NextResponse.json({ success: true });
            }

            log(`[EmbyWebhook] Processing availability for TMDB ID: ${targetTmdbId} (${targetMediaType})`);

            // 1. Find requesters
            const requests = await prisma.mediaRequest.findMany({
                where: {
                    tmdbId: targetTmdbId,
                    mediaType: targetMediaType,
                },
                include: { user: true }
            });

            // 2. Find subscribers
            const subscriptions = await prisma.mediaSubscription.findMany({
                where: {
                    tmdbId: targetTmdbId,
                    mediaType: targetMediaType
                },
                include: { user: true }
            });

            // 3. Merge users
            const usersToNotify = new Map<number, { id: number, name: string }>();
            
            requests.forEach((req: any) => {
                if (req.user) usersToNotify.set(req.user.id, req.user);
            });
            
            subscriptions.forEach((sub: any) => {
                usersToNotify.set(sub.user.id, sub.user);
            });

            log(`[EmbyWebhook] Found ${usersToNotify.size} users to notify for ${item.Name}`);

            // 4. Send notifications
            const notifyPromises = Array.from(usersToNotify.values()).map(async (user) => {
                await NotificationService.notifyUser(
                    user.id,
                    notificationTitle,
                    notificationMessage,
                    'media_available',
                    {
                        mediaId: targetTmdbId,
                        mediaType: targetMediaType,
                        posterPath: undefined, // Service will fetch
                        link: `/dashboard/media/${targetTmdbId}?type=${targetMediaType}`
                    }
                );
            });

            await Promise.all(notifyPromises);
        }
    }

    // ---------------------------------------------------------
    // 2. GESTION DU SUIVI DE LECTURE (PlaybackStop / Progress)
    // ---------------------------------------------------------
    // On enregistre à l'arrêt OU lors d'une progression significative
    // PlaybackProgress permet d'avoir les stats même si la personne ne "finit" pas l'épisode proprement
    if ((eventType === 'PlaybackStop' || eventType === 'PlaybackProgress') && embyUserId && item) {
      const itemId = String(item.Id)
      const playedAt = new Date()
      
      // Calcul de la durée en minutes (ticks -> minutes)
      const positionTicks = playbackInfo?.PositionTicks || 0
      const durationMinutes = Math.round(positionTicks / 600000000)

      // Extraire les infos de session enrichies (style Tracearr)
      const sessionId = session?.Id
      const client = session?.Client
      const device = session?.DeviceName
      const deviceDeviceId = session?.DeviceId
      const ipAddress = session?.RemoteEndPoint
      const playMethod = session?.PlayState?.PlayMethod || playbackInfo?.PlayMethod
      
      // Infos média supplémentaires
      const seasonName = item.SeasonName
      const episodeNumber = item.IndexNumber
      const seasonNumber = item.ParentIndexNumber
      const seriesName = item.SeriesName
      let tmdbId = item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb || item.ProviderIds?.TMDB || null;

      // Si pas de tmdbId, on essaie de le récupérer via imdb ou tvdb
      if (!tmdbId && item.ProviderIds) {
        const imdbId = item.ProviderIds.Imdb || item.ProviderIds.imdb || item.ProviderIds.IMDB;
        const tvdbId = item.ProviderIds.Tvdb || item.ProviderIds.tvdb || item.ProviderIds.TVDB;
        
        if (imdbId || tvdbId) {
          try {
            const tmdbService = await getTmdbService();
            if (tmdbService) {
              if (imdbId) {
                const findResult = await tmdbService.findByExternalId(imdbId, 'imdb_id');
                const foundItem = findResult?.movie_results?.[0] || findResult?.tv_results?.[0] || findResult?.tv_episode_results?.[0];
                if (foundItem) tmdbId = foundItem.id;
              }
              if (!tmdbId && tvdbId) {
                const findResult = await tmdbService.findByExternalId(tvdbId, 'tvdb_id');
                const foundItem = findResult?.movie_results?.[0] || findResult?.tv_results?.[0] || findResult?.tv_episode_results?.[0];
                if (foundItem) tmdbId = foundItem.id;
              }
            }
          } catch (error) {
            warn(`[EmbyWebhook] Failed to fetch tmdbId via external ID for ${item.Name}`, error);
          }
        }
      }

      // On n'enregistre que si la durée est significative (ex: > 1 min)
      if (durationMinutes >= 1) {
        // Trouver l'utilisateur local
        const user = await (prisma as any).user.findFirst({
          where: { 
            embyUserId: embyUserId
          }
        })

        // On cherche s'il existe déjà un événement récent pour cet item/user pour le mettre à jour
        // au lieu d'en créer un nouveau à chaque "Progress"
        const existingEvent = await (prisma as any).watchEvent.findFirst({
          where: {
            embyUserId,
            itemId,
            playedAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 4) // Dans les 4 dernières heures
            }
          },
          orderBy: { playedAt: 'desc' }
        })

        if (existingEvent) {
          // Mise à jour de l'événement existant avec la nouvelle durée et infos
          await (prisma as any).watchEvent.update({
            where: { id: existingEvent.id },
            data: {
              durationMinutes: Math.max(existingEvent.durationMinutes, durationMinutes),
              playedAt: new Date(), // On actualise la date pour le "vu récemment"
              tmdbId: tmdbId ? String(tmdbId) : existingEvent.tmdbId,
              seasonNumber: seasonNumber || existingEvent.seasonNumber,
              seriesName: seriesName || existingEvent.seriesName,
            }
          })
          log(`[Webhook] Updated playback for ${item.Name} (${durationMinutes} min)`)
        } else {
          // Création d'un nouvel événement
          await (prisma as any).watchEvent.create({
            data: {
              embyUserId,
              user: user ? { connect: { id: user.id } } : undefined,
              itemId,
              itemName: item.Name,
              itemType: item.Type,
              durationMinutes,
              playedAt,
              // providerId field removed as it does not exist in WatchEvent model
              // Infos supplémentaires
              sessionId: sessionId || null,
              client: client || null,
              device: device || null,
              // deviceId field removed as it does not exist in WatchEvent model
              ipAddress: ipAddress || null,
              playMethod: playMethod || null,
              seasonName: seasonName || null,
              episodeNumber: episodeNumber || null,
              seasonNumber: seasonNumber || null,
              seriesName: seriesName || null,
              tmdbId: tmdbId ? String(tmdbId) : null,
            }
          })
          log(`[Webhook] Created new playback event for ${item.Name} (${durationMinutes} min)`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    error('[Webhook] Error processing request:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
