import { PrismaClient } from '@prisma/client';
import { JellyseerrService } from './services/jellyseerr';
import { getTmdbServiceForUser } from './auth';

export async function importJellyseerrRequests(prisma: PrismaClient, instanceId: number) {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId }
  });

  if (!instance || !instance.jellyseerrUrl || !instance.jellyseerrApiKey) {
    throw new Error('Jellyseerr n\'est pas configuré pour cette instance.');
  }

  // Get TMDB Service using global config logic
  const tmdb = await getTmdbServiceForUser(instanceId);

  const jellyseerr = new JellyseerrService(instance.jellyseerrUrl, instance.jellyseerrApiKey);
  const requests = await jellyseerr.getAllRequests();

  let imported = 0;
  let skipped = 0;

  for (const req of requests) {
    try {
      // Check if already exists
      const existing = await (prisma as any).mediaRequest.findFirst({
        where: {
          instanceId,
          tmdbId: String(req.media.tmdbId),
          mediaType: req.type
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Map status
      let status = 1; // Default to pending
      if (req.media && req.media.status) {
        status = req.media.status;
      } else if (req.status === 2) {
        status = 2; // Approved
      }

      // Try to get title from TMDB if not provided by Jellyseerr
      let title = req.media.mediaType === 'movie' ? (req.media.title || 'Unknown Movie') : (req.media.name || 'Unknown Show');
      
      if (tmdb && (title === 'Unknown Movie' || title === 'Unknown Show')) {
        const details = await tmdb.getDetails(req.media.tmdbId, req.type);
        if (details) {
          title = (req.type === 'movie' ? details.title : details.name) || title;
        }
      }

      // Find or create user
      let userId = null;
      if (req.requestedBy) {
        const user = await prisma.user.findFirst({
          where: {
            instanceId,
            OR: [
              { email: req.requestedBy.email },
              { jellyseerrUserId: String(req.requestedBy.id) }
            ]
          }
        });
        if (user) {
          userId = user.id;
        }
      }

      await (prisma as any).mediaRequest.create({
        data: {
          instanceId,
          userId,
          mediaType: req.type,
          tmdbId: String(req.media.tmdbId),
          title: title,
          status: status,
          requestedAt: new Date(req.createdAt),
          createdAt: new Date(req.createdAt),
          updatedAt: new Date(req.updatedAt),
          requesterName: req.requestedBy?.displayName || req.requestedBy?.email?.split('@')[0],
          requesterEmail: req.requestedBy?.email,
          requesterAvatar: req.requestedBy?.avatar,
          externalId: String(req.id), // Store Jellyseerr request ID
          metadata: JSON.stringify({
            jellyseerrId: req.id,
            tmdbId: req.media.tmdbId,
            tvdbId: req.media.tvdbId,
            imdbId: req.media.imdbId
          })
        }
      });

      imported++;
    } catch (err) {
      console.error(`[JellyseerrImport] Failed to import request ${req.id}:`, err);
      skipped++;
    }
  }

  return { imported, skipped };
}
