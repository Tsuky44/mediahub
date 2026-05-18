import { db } from '@/lib/db/drizzle';
import { mediaRequests, users } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { JellyseerrService } from './services/jellyseerr';
import { getTmdbService } from './services/tmdb';

export async function importJellyseerrRequests(drizzleDb: typeof db) {
  const jellyseerrUrl = process.env.JELLYSEERR_URL;
  const jellyseerrApiKey = process.env.JELLYSEERR_API_KEY;

  if (!jellyseerrUrl || !jellyseerrApiKey) {
    throw new Error('Jellyseerr n\'est pas configuré.');
  }

  // Get TMDB Service using global config logic
  const tmdb = await getTmdbService();

  const jellyseerr = new JellyseerrService(jellyseerrUrl, jellyseerrApiKey);
  const requests = await jellyseerr.getAllRequests();

  let imported = 0;
  let skipped = 0;

  for (const req of requests) {
    try {
      // Check if already exists
      const existing = await drizzleDb.query.mediaRequests.findFirst({
        where: and(
          eq(mediaRequests.tmdbId, String(req.media.tmdbId)),
          eq(mediaRequests.mediaType, req.type)
        )
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
        const tmdbId = typeof req.media.tmdbId === 'string' ? parseInt(req.media.tmdbId) : req.media.tmdbId;
        const details = await tmdb.getDetails(tmdbId, req.type);
        if (details) {
          title = (req.type === 'movie' ? details.title : details.name) || title;
        }
      }

      // Find or create user
      let userId = null;
      if (req.requestedBy) {
        const user = await drizzleDb.query.users.findFirst({
          where: or(
            eq(users.email, req.requestedBy.email),
            eq(users.jellyseerrUserId, String(req.requestedBy.id))
          )
        });
        if (user) {
          userId = user.id;
        }
      }

      await drizzleDb.insert(mediaRequests).values({
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
      });

      imported++;
    } catch (err) {
      console.error(`[JellyseerrImport] Failed to import request ${req.id}:`, err);
      skipped++;
    }
  }

  return { imported, skipped };
}
