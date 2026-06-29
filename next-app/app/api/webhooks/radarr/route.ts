﻿﻿﻿﻿﻿/**
 * Radarr Webhook â€” Notifications V2
 * ReÃ§oit tous les events de Radarr et les dispatche via le systÃ¨me V2 (DB + Outbox)
 * Events supportÃ©s : Grab, Download, Import, Rename, MovieDelete, Health
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { mediaRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { dispatch } from '@/lib/notifications-v2/dispatcher';
import { logger } from '@/lib/logger';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '@/lib/notifications-v2/types';

export const dynamic = 'force-dynamic'

// Mapping des events Radarr vers events V2
// Radarr 'Grab'     = release saisie par Radarr (= tÃ©lÃ©chargement lancÃ©)
// Radarr 'Download' = fichier importÃ© dans la bibliothÃ¨que (= DISPO) !
//                    âš  Dans Radarr, Download = Import complet, pas juste DL fini
// Radarr 'MovieAdded' = film ajoutÃ© manuellement (= aussi DISPO)
// Radarr 'Import' n'existe pas comme event webhook Radarr standard
const EVENT_MAP: Record<string, NotificationEvent> = {
  'Grab': NOTIFICATION_EVENTS.MEDIA_GRABBED,
  'Download': NOTIFICATION_EVENTS.MEDIA_AVAILABLE,   // Radarr Download = import complet = dispo
  'MovieAdded': NOTIFICATION_EVENTS.MEDIA_AVAILABLE,
  'MovieDelete': NOTIFICATION_EVENTS.MEDIA_FAILED,
  // Rename et Health sont ignorÃ©s pour les notifs
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventType, movie } = body;

    logger.info(`[RadarrWebhook V2] Received event: ${eventType}`);

    // Ignorer les events non mappÃ©s (Rename, Health, etc.)
    const v2Event = EVENT_MAP[eventType];
    if (!v2Event) {
      logger.info(`[RadarrWebhook V2] Event ${eventType} ignored (not mapped)`);
      return NextResponse.json({ success: true });
    }

    // VÃ©rifier les donnÃ©es minimales
    if (!movie?.tmdbId) {
      logger.warn(`[RadarrWebhook V2] Missing TMDB ID for event ${eventType}`);
      return NextResponse.json({ success: true });
    }

    const tmdbId = String(movie.tmdbId);
    const title = movie.title || 'Film inconnu';
    const year = movie.year;

    logger.info(`[RadarrWebhook V2] Processing ${eventType} â†’ ${v2Event} for TMDB ${tmdbId}`);

    // RÃ©cupÃ©rer les requÃªtes et abonnements pour trouver le requester
    const requests = await db.query.mediaRequests.findMany({
      where: and(
        eq(mediaRequests.tmdbId, tmdbId),
        eq(mediaRequests.mediaType, 'movie')
      ),
      with: { user: true },
      limit: 1 // On prend le premier requester trouvÃ©
    });

    // Construire le requester (si trouvÃ©)
    const requester = requests[0]?.user ? {
      id: requests[0].user.id,
      name: requests[0].user.name || undefined,
      email: requests[0].user.email || undefined,
      whatsappNumber: (requests[0].user as Record<string, unknown>).whatsappNumber as string | undefined,
    } : undefined;

    // RÃ©cupÃ©rer les infos mÃ©dia depuis TMDB
    let posterPath: string | undefined;
    let overview: string | undefined;
    try {
      const { getTmdbService } = await import('@/lib/services/tmdb');
      const tmdbService = await getTmdbService();
      if (tmdbService) {
        const mediaInfo = await tmdbService.getDetails(parseInt(tmdbId), 'movie');
        if (mediaInfo) {
          posterPath = mediaInfo.poster_path || undefined;
          overview = mediaInfo.overview || undefined;
        }
      }
    } catch (e) {
      logger.warn(`[RadarrWebhook V2] Failed to fetch TMDB info:`, e);
    }

    // Construire le contexte de download (si disponible)
    // Pour Grab : infos de la release (taille estimÃ©e, qualitÃ©)
    // Pour Download : infos du fichier importÃ© (taille rÃ©elle)
    const download = (eventType === 'Grab' || eventType === 'Download') ? {
      quality: body.movieFile?.quality?.quality?.name || body.release?.quality?.name || body.release?.quality || undefined,
      size: body.movieFile?.size
        ? `${(body.movieFile.size / 1_073_741_824).toFixed(2)} GB`
        : (body.release?.size ? `${(body.release.size / 1_073_741_824).toFixed(2)} GB` : undefined),
      releaseName: body.movieFile?.relativePath || body.movieFile?.releaseGroup || body.release?.releaseTitle || undefined,
    } : undefined;

    // Enregistrer le torrent dans le qBittorrent Watch Poller pour suivre la progression (1% et 100%)
    if (eventType === 'Grab') {
      try {
        const { getQbitWatchPoller } = await import('@/lib/notifications-v2/realtime/qbit-watch-poller');
        getQbitWatchPoller().addWatch({
          hash: body.downloadId || undefined,
          releaseName: body.release?.releaseTitle || undefined,
          media: {
            tmdbId,
            mediaType: 'movie',
            title,
            year: year ? String(year) : undefined,
            overview,
            posterPath,
          },
          requester,
        });
      } catch (e) {
        logger.error('[RadarrWebhook V2] Failed to register torrent in QbitWatchPoller:', e);
      }
    }

    // Dispatcher via V2 (enregistre en DB + outbox)
    // On utilise un correlationId avec timestamp pour permettre plusieurs Ã©vÃ©nements
    // du mÃªme type sur le mÃªme tmdbId (ex: nouveau grab aprÃ¨s un Ã©chec)
    const correlationId = `radarr-${eventType.toLowerCase()}-${tmdbId}-${Date.now()}`;
    const result = await dispatch(v2Event, {
      correlationId,
      media: {
        tmdbId,
        mediaType: 'movie',
        title,
        year: year ? String(year) : undefined,
        overview,
        posterPath,
      },
      requester,
      download,
    });

    if (result.wasDuplicate) {
      logger.info(`[RadarrWebhook V2] Duplicate event skipped for TMDB ${tmdbId}`);
    } else if (result.success) {
      logger.info(`[RadarrWebhook V2] Dispatched ${v2Event} to ${result.recipients.length} recipient(s)`);
    } else {
      logger.error(`[RadarrWebhook V2] Failed to dispatch: ${result.error}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[RadarrWebhook V2] Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
