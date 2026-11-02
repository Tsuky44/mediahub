﻿﻿﻿﻿﻿/**
 * Sonarr Webhook â€” Notifications V2
 * ReÃ§oit tous les events de Sonarr et les dispatche via le systÃ¨me V2 (DB + Outbox)
 * Events supportÃ©s : Grab, Download, Import, Rename, SeriesDelete, EpisodeDelete, Health
 *
 * SimplifiÃ© V3: Plus de batch logic, dispatch direct par saison pour les packs complets.
 * Import gÃ©rÃ© sÃ©parÃ©ment pour dÃ©tecter saison complÃ¨te vs partielle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSecret } from '@/lib/webhooks/verify-secret';
import { db } from '@/lib/db/drizzle';
import { mediaRequests } from '@/lib/db/schema';
import { eq, and, ne, like } from 'drizzle-orm';
import { dispatch } from '@/lib/notifications-v2/dispatcher';
import { logger } from '@/lib/logger';
import { notifyOnyx } from '@/lib/integrations/onyx-webhook';
import { emitRequestStatus } from '@/lib/integrations/player-v1';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '@/lib/notifications-v2/types';
import { getSonarrService } from '@/lib/services/sonarr';

export const dynamic = 'force-dynamic'

// Mapping des events Sonarr vers events V2
// IMPORTANT: Dans Sonarr, l'event 'Download' = OnImport (fichier importÃ© dans la bibliothÃ¨que)
// Il est gÃ©rÃ© sÃ©parÃ©ment via handleImportEvent pour dÃ©tecter saison complÃ¨te vs partielle.
// MEDIA_DOWNLOADING / MEDIA_DOWNLOAD_COMPLETE / MEDIA_IMPORTING sont fournis par le QueuePoller.
const EVENT_MAP: Record<string, NotificationEvent> = {
  'Grab': NOTIFICATION_EVENTS.MEDIA_GRABBED,
  'SeriesDelete': NOTIFICATION_EVENTS.MEDIA_FAILED,
  'EpisodeDelete': NOTIFICATION_EVENTS.MEDIA_FAILED,
  // Download (= Import), Rename et Health gÃ©rÃ©s ailleurs
};

// Helper pour grouper les Ã©pisodes par saison
function groupEpisodesBySeason(episodes: Array<{ seasonNumber?: number; episodeNumber?: number }>) {
  const grouped: Record<number, number[]> = {};
  for (const ep of episodes) {
    if (ep.seasonNumber != null && ep.episodeNumber != null) {
      if (!grouped[ep.seasonNumber]) {
        grouped[ep.seasonNumber] = [];
      }
      grouped[ep.seasonNumber].push(ep.episodeNumber);
    }
  }
  return grouped;
}

// Helper pour gÃ©rer les events Import/Upgrade
async function handleImportEvent(body: any) {
  const { series, episodes } = body;
  // IDs des Ã©pisodes prÃ©sents dans ce webhook (ceux qu'on vient d'importer)
  const webhookEpisodeIds = new Set<number>(
    Array.isArray(episodes)
      ? episodes.map((e: { id?: number }) => e?.id).filter((id): id is number => typeof id === 'number')
      : []
  );

  if (!series?.tvdbId) {
    logger.warn(`[SonarrWebhook V2] Import event missing TVDB ID`);
    return NextResponse.json({ success: true });
  }

  // Convertir TVDB ID en TMDB ID
  const { getTmdbService } = await import('@/lib/services/tmdb');
  const tmdbService = await getTmdbService();
  let tmdbId: string | null = null;

  if (tmdbService) {
    const result = await tmdbService.findByExternalId(series.tvdbId, 'tvdb_id');
    if (result?.tv_results?.length > 0) {
      tmdbId = String(result.tv_results[0].id);
    }
  }

  if (!tmdbId) {
    logger.warn(`[SonarrWebhook V2] Import event could not find TMDB ID`);
    return NextResponse.json({ success: true });
  }

  const title = series.title || 'SÃ©rie inconnue';
  const episodeList: Array<{ seasonNumber?: number; episodeNumber?: number }> = episodes || [];

  if (episodeList.length === 0) {
    return NextResponse.json({ success: true });
  }

  // RÃ©cupÃ©rer le requester
  const requests = await db.query.mediaRequests.findMany({
    where: and(eq(mediaRequests.tmdbId, tmdbId), eq(mediaRequests.mediaType, 'tv')),
    with: { user: true },
    limit: 1,
  });

  const requester = requests[0]?.user ? {
    id: requests[0].user.id,
    name: requests[0].user.name || undefined,
    email: requests[0].user.email || undefined,
    whatsappNumber: (requests[0].user as Record<string, unknown>).whatsappNumber as string | undefined,
  } : undefined;

  // RÃ©cupÃ©rer les infos mÃ©dia
  let posterPath: string | undefined;
  let overview: string | undefined;
  try {
    if (tmdbService) {
      const mediaInfo = await tmdbService.getDetails(parseInt(tmdbId), 'tv');
      if (mediaInfo) {
        posterPath = mediaInfo.poster_path || undefined;
        overview = mediaInfo.overview || undefined;
      }
    }
  } catch (e) {
    logger.warn(`[SonarrWebhook V2] Failed to fetch TMDB info:`, e);
  }

  // Grouper les Ã©pisodes par saison
  const groupedEpisodes = groupEpisodesBySeason(episodeList);

  // RÃ©cupÃ©rer les stats de la sÃ©rie + la queue Sonarr une seule fois
  let sonarrSeries: {
    id?: number;
    seasons?: Array<{ seasonNumber: number; statistics?: { episodeCount: number; episodeFileCount: number } }>
  } | null = null;
  let sonarrQueue: Awaited<ReturnType<NonNullable<Awaited<ReturnType<typeof getSonarrService>>>['getQueue']>> = [];
  try {
    const sonarr = await getSonarrService();
    if (sonarr) {
      [sonarrSeries, sonarrQueue] = await Promise.all([
        sonarr.getSeriesByTvdbId(series.tvdbId),
        sonarr.getQueue().catch(() => []),
      ]);
    }
  } catch (e) {
    logger.warn(`[SonarrWebhook V2] Failed to fetch series stats / queue:`, e);
  }

  const seriesIdSonarr = sonarrSeries?.id;

  // Calculer quelles saisons sont encore en queue (hors Ã©pisodes du webhook courant)
  const pendingQueueSeasons = new Set<number>();
  for (const q of sonarrQueue) {
    const qSeriesId = q.seriesId ?? q.series?.id;
    if (seriesIdSonarr != null && qSeriesId !== seriesIdSonarr) continue;
    if (seriesIdSonarr == null && q.series?.tvdbId !== series.tvdbId) continue;

    const qSeasonNum = q.episode?.seasonNumber ?? q.seasonNumber;
    if (qSeasonNum == null) continue;

    const qEpisodeId = q.episodeId ?? q.episode?.id;
    if (qEpisodeId != null && webhookEpisodeIds.has(qEpisodeId)) continue;

    const tState = (q.trackedDownloadState || '').toLowerCase();
    if (tState === 'completed' || tState === 'imported' || tState === 'failed') continue;

    pendingQueueSeasons.add(qSeasonNum);
  }

  // NE PAS dispatcher directement MEDIA_AVAILABLE ici.
  // On met a jour le status des requests (5=available, 4=partial) et on laisse
  // l'AvailabilityPoller gerer la notification avec dedup + logique grouped seasons.
  // Cela evite les race conditions avec MEDIA_REQUESTED et les notifs en desordre.

  for (const [seasonNumber, episodeNumbers] of Object.entries(groupedEpisodes)) {
    const seasonNum = parseInt(seasonNumber);
    const importedCount = episodeNumbers.length;

    if (pendingQueueSeasons.has(seasonNum)) {
      logger.info(`[SonarrWebhook V2] Season ${seasonNum}: still in Sonarr queue, skipping`);
      continue;
    }

    const seasonStats = sonarrSeries?.seasons?.find((s) => s.seasonNumber === seasonNum)?.statistics;
    const totalEpisodes = seasonStats?.episodeCount ?? 0;
    const fileCount = seasonStats?.episodeFileCount ?? 0;

    const isComplete = (totalEpisodes > 0 && fileCount >= totalEpisodes)
      || (totalEpisodes > 0 && importedCount >= totalEpisodes);

    // Update request status: 5=available, 4=partial
    // The AvailabilityPoller will dispatch the notification with proper dedup
    const newStatus = isComplete ? 5 : 4;
    const toUpdate = and(
      eq(mediaRequests.tmdbId, tmdbId),
      eq(mediaRequests.mediaType, 'tv'),
      like(mediaRequests.metadata || '', `%"seasons":[${seasonNum}]%`),
      ne(mediaRequests.status, 5)
    );
    const changedIds = (await db.select({ id: mediaRequests.id }).from(mediaRequests).where(toUpdate)).map((r) => r.id);
    await db.update(mediaRequests)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(toUpdate);
    await emitRequestStatus(changedIds);
    const importedPaths: string[] = [];
    const seriesPath: string | undefined = body.series?.path;
    const files: Array<{ path?: string; relativePath?: string; seasonNumber?: number }> = [
      ...(Array.isArray(body.episodeFiles) ? body.episodeFiles : []),
      ...(body.episodeFile ? [body.episodeFile] : []),
    ];
    for (const file of files) {
      const full = file.path || (seriesPath && file.relativePath ? `${seriesPath}/${file.relativePath}` : undefined);
      if (full) importedPaths.push(full);
    }
    notifyOnyx('media.imported', { tmdbId: Number(tmdbId), mediaType: 'tv', seasons: [seasonNum], paths: importedPaths });

    logger.info(`[SonarrWebhook V2] Season ${seasonNum}: ${isComplete ? 'complete' : 'partial'} (${fileCount}/${totalEpisodes}) -> request status=${newStatus}. AvailabilityPoller will dispatch.`);

    // Episode-level notification for partial seasons (via batcher)
    if (!isComplete) {
      const { episodeImportBatcher } = await import('@/lib/notifications-v2/utils/episode-import-batcher');
      for (const epNum of episodeNumbers) {
        episodeImportBatcher.add(tmdbId, seasonNum, epNum, {
          tmdbId,
          title,
          overview,
          posterPath,
          seasonNumber: seasonNum,
          requester,
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const isValid = await verifyWebhookSecret(req, 'webhook_sonarr_secret');
    if (!isValid) {
      logger.warn('[SonarrWebhook] Tentative d\'accès non autorisée (secret invalide ou absent)');
      return NextResponse.json({ error: 'Unauthorized. Invalid secret.' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, series, episodes } = body;

    logger.info(`[SonarrWebhook V2] Received event: ${eventType}`);

    // Sonarr 'Download' = OnImport (fichier importÃ©) â†’ routage spÃ©cial pour dÃ©tecter
    // saison complÃ¨te vs partielle
    if (eventType === 'Download' || eventType === 'Import' || eventType === 'Upgrade') {
      return await handleImportEvent(body);
    }

    // Ignorer les events non mappÃ©s
    const v2Event = EVENT_MAP[eventType];
    if (!v2Event) {
      logger.info(`[SonarrWebhook V2] Event ${eventType} ignored (not mapped)`);
      return NextResponse.json({ success: true });
    }

    // VÃ©rifier les donnÃ©es minimales
    if (!series?.tvdbId) {
      logger.warn(`[SonarrWebhook V2] Missing TVDB ID for event ${eventType}`);
      return NextResponse.json({ success: true });
    }

    // Convertir TVDB ID en TMDB ID
    const { getTmdbService } = await import('@/lib/services/tmdb');
    const tmdbService = await getTmdbService();
    let tmdbId: string | null = null;

    if (tmdbService) {
      const result = await tmdbService.findByExternalId(series.tvdbId, 'tvdb_id');
      if (result?.tv_results?.length > 0) {
        tmdbId = String(result.tv_results[0].id);
      }
    }

    if (!tmdbId) {
      logger.warn(`[SonarrWebhook V2] Could not find TMDB ID for TVDB ID ${series.tvdbId}`);
      return NextResponse.json({ success: true });
    }

    const title = series.title || 'SÃ©rie inconnue';
    const episodeList: Array<{ seasonNumber?: number; episodeNumber?: number }> = episodes || [];

    logger.info(`[SonarrWebhook V2] Processing ${eventType} â†’ ${v2Event} for TMDB ${tmdbId}`);

    // RÃ©cupÃ©rer le requester
    const requests = await db.query.mediaRequests.findMany({
      where: and(
        eq(mediaRequests.tmdbId, tmdbId),
        eq(mediaRequests.mediaType, 'tv')
      ),
      with: { user: true },
      limit: 1
    });

    const requester = requests[0]?.user ? {
      id: requests[0].user.id,
      name: requests[0].user.name || undefined,
      email: requests[0].user.email || undefined,
      whatsappNumber: (requests[0].user as Record<string, unknown>).whatsappNumber as string | undefined,
    } : undefined;

    // RÃ©cupÃ©rer les infos mÃ©dia
    let posterPath: string | undefined;
    let overview: string | undefined;
    try {
      if (tmdbService) {
        const mediaInfo = await tmdbService.getDetails(parseInt(tmdbId), 'tv');
        if (mediaInfo) {
          posterPath = mediaInfo.poster_path || undefined;
          overview = mediaInfo.overview || undefined;
        }
      }
    } catch (e) {
      logger.warn(`[SonarrWebhook V2] Failed to fetch TMDB info:`, e);
    }

    let dispatchResult: Awaited<ReturnType<typeof dispatch>>;

    // Pack detection logic for Grab events
    // On utilise le SeasonGrabBatcher pour regrouper les saisons d'une mÃªme sÃ©rie
    // mÃªme si elles arrivent dans des webhooks sÃ©parÃ©s (packs diffÃ©rents).
    if (eventType === 'Grab' && episodeList.length > 0) {
      const groupedEpisodes = groupEpisodesBySeason(episodeList);
      const seasonNumbers = Object.keys(groupedEpisodes).map(Number).sort((a, b) => a - b);
      const download = {
        quality: body.release?.quality || undefined,
        size: body.release?.size ? String(body.release.size) : undefined,
        releaseName: body.release?.releaseTitle || undefined,
      };

      // Enregistrer le torrent dans le qBittorrent Watch Poller pour suivre la progression (1% et 100%)
      try {
        const { getQbitWatchPoller } = await import('@/lib/notifications-v2/realtime/qbit-watch-poller');
        getQbitWatchPoller().addWatch({
          hash: body.downloadId || undefined,
          releaseName: body.release?.releaseTitle || undefined,
          media: {
            tmdbId: String(tmdbId),
            mediaType: 'tv',
            title,
            overview,
            posterPath,
            seasonNumber: seasonNumbers[0],
          },
          requester,
        });
      } catch (e) {
        logger.error('[SonarrWebhook V2] Failed to register torrent in QbitWatchPoller:', e);
      }

      const { grabBatcher } = await import('@/lib/notifications-v2/utils/grab-batcher');
      for (const seasonNum of seasonNumbers) {
        grabBatcher.add(String(tmdbId), seasonNum, {
          tmdbId: String(tmdbId),
          title,
          overview,
          posterPath,
          requester,
          download,
        });
      }
      return NextResponse.json({ success: true });
    }

    // Events Download, Delete â†’ comportement standard avec saison si dispo
    const download = (eventType === 'Grab' || eventType === 'Download') ? {
      quality: body.release?.quality?.name || body.release?.quality || undefined,
      size: body.release?.size ? `${(body.release.size / 1_073_741_824).toFixed(2)} GB` : undefined,
      releaseName: body.release?.releaseTitle || undefined,
    } : undefined;

    // Extraire le numÃ©ro de saison depuis le premier Ã©pisode si dispo
    const firstEpisode = episodeList[0];
    const seasonNumber = firstEpisode?.seasonNumber;

    dispatchResult = await dispatch(v2Event, {
      correlationId: `sonarr-${eventType.toLowerCase()}-${tmdbId}-${seasonNumber ?? 'ns'}-${Date.now()}`,
      media: {
        tmdbId,
        mediaType: 'tv',
        title: seasonNumber !== undefined ? `${title} - Saison ${seasonNumber}` : title,
        overview,
        posterPath,
        seasonNumber,
      },
      requester,
      download,
    });

    if (dispatchResult.wasDuplicate) {
      logger.info(`[SonarrWebhook V2] Duplicate event skipped for TMDB ${tmdbId}`);
    } else if (dispatchResult.success) {
      logger.info(`[SonarrWebhook V2] Dispatched to ${dispatchResult.recipients.length} recipient(s)`);
    } else {
      logger.error(`[SonarrWebhook V2] Failed to dispatch: ${dispatchResult.error}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[SonarrWebhook V2] Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
