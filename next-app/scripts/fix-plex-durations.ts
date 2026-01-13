import { PrismaClient } from '@prisma/client';
import { PlexService } from '../lib/services/plex';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixDurations() {
  console.log('--- Fixing Plex Durations ---');

  // Find the "Ledu" instance
  const instance = await (prisma as any).instance.findFirst({
    where: {
      name: {
        contains: 'Ledu',
      },
    },
  });

  if (!instance || !instance.plexUrl || !instance.plexToken) {
    console.error('Ledu instance not found or missing Plex credentials.');
    return;
  }

  console.log(`Using instance: ${instance.name} (ID: ${instance.id})`);
  const plexService = new PlexService(instance.plexUrl, instance.plexToken);

  // Get all unique itemIds with 0 duration
  const logsWithZeroDuration = await (prisma as any).embyActivityLog.findMany({
    where: {
      instanceId: instance.id,
      playDuration: 0,
      source: 'plex'
    },
    select: {
      itemId: true
    }
  });

  const uniqueItemIds = Array.from(new Set(logsWithZeroDuration.map((log: any) => String(log.itemId))));
  console.log(`Found ${logsWithZeroDuration.length} logs with 0 duration across ${uniqueItemIds.length} unique items.`);

  const durationCache = new Map<string, number>();
  let fixedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < uniqueItemIds.length; i++) {
    const itemId = uniqueItemIds[i];
    
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${uniqueItemIds.length} items checked. Fixed so far: ${fixedCount}`);
    }

    try {
      let durationMs = 0;
      
      // Fetch details from Plex
      const details = await plexService.getItemDetails(itemId);
      if (details && details.duration) {
        durationMs = details.duration;
      } else {
        // Fallback for some items that might not have duration in metadata
        // but might have it in Media[0].duration
        if (details?.Media?.[0]?.duration) {
          durationMs = details.Media[0].duration;
        }
      }

      if (durationMs > 0) {
        const playDurationSeconds = Math.round(durationMs / 1000);
        const totalDurationTicks = BigInt(durationMs) * BigInt(10000);
        const durationMinutes = Math.round(durationMs / 60000);

        // Update all logs for this item
        await (prisma as any).embyActivityLog.updateMany({
          where: {
            instanceId: instance.id,
            itemId: itemId,
            playDuration: 0,
            source: 'plex'
          },
          data: {
            playDuration: playDurationSeconds,
            totalDuration: totalDurationTicks
          }
        });

        // Update WatchEvents too
        await (prisma as any).watchEvent.updateMany({
          where: {
            instanceId: instance.id,
            itemId: itemId,
            durationMinutes: 0
          },
          data: {
            durationMinutes: durationMinutes
          }
        });

        fixedCount++;
      }
    } catch (err) {
      console.error(`Error processing item ${itemId}:`, err);
      errorCount++;
    }
  }

  console.log('\n--- Fix Completed ---');
  console.log(`Total unique items fixed: ${fixedCount}`);
  console.log(`Errors encountered: ${errorCount}`);

  await prisma.$disconnect();
}

fixDurations().catch(err => {
  console.error('Fix script failed:', err);
  process.exit(1);
});
