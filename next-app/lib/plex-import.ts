import { db } from '@/lib/db/drizzle';
import { watchEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { PlexService } from './services/plex';
import { getSetting } from './settings';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };

export async function importPlexHistory(drizzleDb: typeof db, progressCallback?: (data: { imported: number, skipped: number, total: number, status: string }) => void) {
  log('--- Robust Plex History Import ---');

  const plexUrl = await getSetting('PLEX_URL');
  const plexToken = await getSetting('PLEX_TOKEN');

  if (!plexUrl || !plexToken) {
    throw new Error('Plex credentials not found in settings (PLEX_URL, PLEX_TOKEN).');
  }

  const plexService = new PlexService(plexUrl, plexToken);
  
  let offset = 0;
  const limit = 2000; // Smaller batches for better progress reporting
  let totalImported = 0;
  let totalSkipped = 0;
  let consecutiveDuplicates = 0;
  const MAX_CONSECUTIVE_DUPLICATES = 500;

  progressCallback?.({ imported: 0, skipped: 0, total: 0, status: 'Starting import...' });

  while (true) {
    log(`Fetching history (offset: ${offset}, limit: ${limit})...`);
    const history = await plexService.getHistory(limit, offset);

    if (!history || history.length === 0) {
      log('No more history to fetch from Plex.');
      break;
    }

    let batchImported = 0;
    let batchSkipped = 0;

    for (const item of history) {
      try {
        const playedAt = new Date(item.viewedAt * 1000);
        const userId = String(item.accountID || item.User?.id || 'unknown');
        const itemId = String(item.ratingKey);
        
        /*
        // Check if already exists in EmbyActivityLog
        const existingLog = await prisma.embyActivityLog.findFirst({
          where: {
            embyUserId: userId,
            itemId: itemId,
            startTime: playedAt,
          },
        });
        */
        const existingLog = null; // Forced to null to skip check, logic below needs adjustment

        if (!existingLog) {
          consecutiveDuplicates = 0;
          
          let duration = item.duration || 0;
          
          // IMPROVEMENT: If duration is missing, try to fetch it from metadata (Tautulli style)
          if (duration === 0) {
            /*
            const details = await plexService.getItemDetails(itemId);
            if (details && details.duration) {
              duration = details.duration;
            }
            */
          }

          /*
          // Normalize to EmbyActivityLog
          await prisma.embyActivityLog.create({
            data: {
              source: 'plex',
              embyUserId: userId,
              userName: item.userTitle || item.User?.title || 'Plex User',
              itemId: itemId,
              itemName: item.title || item.grandparentTitle || 'Unknown',
              itemType: item.type === 'episode' ? 'Episode' : (item.type === 'movie' ? 'Movie' : 'Unknown'),
              startTime: playedAt,
              endTime: new Date(playedAt.getTime() + duration),
              playDuration: Math.round(duration / 1000), 
              totalDuration: duration ? BigInt(duration) * BigInt(10000) : null,
              client: item.Player?.product || 'Plex',
              device: item.Player?.title || 'Plex Device',
              deviceId: item.Player?.machineIdentifier,
              mediaInfo: JSON.stringify({
                seriesName: item.grandparentTitle,
                seasonName: item.parentTitle,
                seriesId: item.grandparentRatingKey,
                episodeIndex: item.index,
                seasonIndex: item.parentIndex,
                migratedFrom: 'Plex Import'
              })
            }
          });
          */

          // Also populate WatchEvent for trends
          try {
            // Check if already exists
            const existing = await drizzleDb.query.watchEvents.findFirst({
              where: and(
                eq(watchEvents.embyUserId, userId),
                eq(watchEvents.itemId, itemId),
                eq(watchEvents.playedAt, playedAt)
              )
            });

            if (!existing) {
              await drizzleDb.insert(watchEvents).values({
                embyUserId: userId,
                userName: item.userTitle || item.User?.title || 'Plex User',
                itemId: itemId,
                itemName: item.title || item.grandparentTitle || 'Unknown',
                itemType: item.type === 'episode' ? 'Episode' : (item.type === 'movie' ? 'Movie' : 'Unknown'),
                playedAt: playedAt,
                durationMinutes: Math.round(duration / 60000),
                client: item.Player?.product || 'Plex',
                device: item.Player?.title || 'Plex Device',
                seriesName: item.grandparentTitle,
                seasonName: item.parentTitle,
                episodeNumber: item.index,
                createdAt: new Date()
              }).onConflictDoNothing();
            }
          } catch (e) {
            // WatchEvent might fail due to unique constraint, which is fine
          }

          totalImported++;
          batchImported++;
        } else {
          totalSkipped++;
          batchSkipped++;
          consecutiveDuplicates++;
        }
      } catch (err) {
        error(`Failed to import item ${item.ratingKey}:`, err);
      }
    }

    progressCallback?.({ 
      imported: totalImported, 
      skipped: totalSkipped, 
      total: totalImported + totalSkipped,
      status: `Importing... (${totalImported} new entries)`
    });

    if (consecutiveDuplicates >= MAX_CONSECUTIVE_DUPLICATES) {
      log(`Reached ${MAX_CONSECUTIVE_DUPLICATES} consecutive duplicates. Assuming we've reached already imported data.`);
      break;
    }

    offset += limit;
    
    // Safety break to avoid infinite loops if Plex history is weirdly reported
    if (offset > 1000000) {
        break;
    }
  }

  return {
    imported: totalImported,
    skipped: totalSkipped
  };
}
