import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') }); // Override with local if exists
import { PrismaClient } from '@prisma/client'
import { EmbyService } from '../lib/services/emby'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting backfill of WatchEvent tmdbId...')

  // Fetch Emby settings from database
  const settings = await prisma.setting.findMany({
      where: {
          key: { in: ['emby_url', 'emby_api_key'] }
      }
  });
  
  const embyUrl = settings.find((s: any) => s.key === 'emby_url')?.value;
  const embyApiKey = settings.find((s: any) => s.key === 'emby_api_key')?.value;

  if (!embyUrl || !embyApiKey) {
      console.error('Emby URL or API Key missing in database settings.');
      return;
  }

  const embyService = new EmbyService(embyUrl, embyApiKey);
  
  // Find all WatchEvents where tmdbId is null
  const events = await prisma.watchEvent.findMany({
    where: {
      tmdbId: null
    }
  })
  
  console.log(`Found ${events.length} events to backfill.`)
  
  let updatedCount = 0;
  
  for (const event of events) {
    if (!event.itemId) continue;
    
    try {
      const itemInfo = await embyService.getItemDetails(event.itemId);
      
      if (itemInfo && itemInfo.ProviderIds) {
        const tmdbId = itemInfo.ProviderIds.Tmdb || itemInfo.ProviderIds.tmdb || itemInfo.ProviderIds.TMDB;
        
        if (tmdbId) {
          await prisma.watchEvent.update({
            where: { id: event.id },
            data: { tmdbId: String(tmdbId) }
          });
          updatedCount++;
          console.log(`Updated event ${event.id} for item ${event.itemId} with tmdbId ${tmdbId}`);
        } else {
            // No tmdbId found, but let's check if it's an episode and we can get series tmdbId
            if (itemInfo.Type === 'Episode' && itemInfo.SeriesId) {
                const seriesInfo = await embyService.getItemDetails(itemInfo.SeriesId);
                const seriesTmdbId = seriesInfo?.ProviderIds?.Tmdb || seriesInfo?.ProviderIds?.tmdb || seriesInfo?.ProviderIds?.TMDB;
                if (seriesTmdbId) {
                    await prisma.watchEvent.update({
                        where: { id: event.id },
                        data: { tmdbId: String(seriesTmdbId) }
                    });
                    updatedCount++;
                    console.log(`Updated event ${event.id} (Episode) for item ${event.itemId} with series tmdbId ${seriesTmdbId}`);
                }
            } else {
                console.log(`No tmdbId found for item ${event.itemId}`);
            }
        }
      }
    } catch (e: any) {
      console.error(`Error processing item ${event.itemId}:`, e.message);
    }
    
    // Add a small delay to avoid hammering the API
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Backfill complete. Updated ${updatedCount} events.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })