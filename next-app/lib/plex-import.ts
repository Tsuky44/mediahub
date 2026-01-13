import { PrismaClient } from '@prisma/client';
import { PlexService } from './services/plex';

export async function importPlexHistory(prisma: PrismaClient, instanceId: number, progressCallback?: (data: { imported: number, skipped: number, total: number, status: string }) => void) {
  console.log('--- Robust Plex History Import ---');

  const instance = await (prisma as any).instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance || !instance.plexUrl || !instance.plexToken) {
    throw new Error('Instance not found or missing Plex credentials.');
  }

  const plexService = new PlexService(instance.plexUrl, instance.plexToken);
  
  let offset = 0;
  const limit = 2000; // Smaller batches for better progress reporting
  let totalImported = 0;
  let totalSkipped = 0;
  let consecutiveDuplicates = 0;
  const MAX_CONSECUTIVE_DUPLICATES = 500;

  progressCallback?.({ imported: 0, skipped: 0, total: 0, status: 'Starting import...' });

  while (true) {
    console.log(`Fetching history (offset: ${offset}, limit: ${limit})...`);
    const history = await plexService.getHistory(limit, offset);

    if (!history || history.length === 0) {
      console.log('No more history to fetch from Plex.');
      break;
    }

    let batchImported = 0;
    let batchSkipped = 0;

    for (const item of history) {
      try {
        const playedAt = new Date(item.viewedAt * 1000);
        const userId = String(item.accountID || item.User?.id || 'unknown');
        const itemId = String(item.ratingKey);
        
        // Check if already exists in EmbyActivityLog
        const existingLog = await (prisma as any).embyActivityLog.findFirst({
          where: {
            instanceId: instance.id,
            embyUserId: userId,
            itemId: itemId,
            startTime: playedAt,
          },
        });

        if (!existingLog) {
          consecutiveDuplicates = 0;
          
          let duration = item.duration || 0;
          
          // IMPROVEMENT: If duration is missing, try to fetch it from metadata (Tautulli style)
          if (duration === 0) {
            const details = await plexService.getItemDetails(itemId);
            if (details && details.duration) {
              duration = details.duration;
            }
          }

          // Normalize to EmbyActivityLog
          await (prisma as any).embyActivityLog.create({
            data: {
              instanceId: instance.id,
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

          // Also populate WatchEvent for trends
          try {
            await (prisma as any).watchEvent.upsert({
              where: {
                embyUserId_itemId_playedAt: {
                  embyUserId: userId,
                  itemId: itemId,
                  playedAt: playedAt,
                }
              },
              update: {},
              create: {
                instanceId: instance.id,
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
              }
            });
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
        console.error(`Failed to import item ${item.ratingKey}:`, err);
      }
    }

    progressCallback?.({ 
      imported: totalImported, 
      skipped: totalSkipped, 
      total: totalImported + totalSkipped,
      status: `Importing... (${totalImported} new entries)`
    });

    if (consecutiveDuplicates >= MAX_CONSECUTIVE_DUPLICATES) {
      console.log(`Reached ${MAX_CONSECUTIVE_DUPLICATES} consecutive duplicates. Assuming we've reached already imported data.`);
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
