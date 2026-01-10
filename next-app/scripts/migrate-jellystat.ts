import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Jellystat Postgres Credentials (to be filled in .env or passed here)
const JELLYSTAT_DB_CONFIG = {
  user: process.env.JELLYSTAT_DB_USER || 'jfstat',
  host: process.env.JELLYSTAT_DB_HOST || 'localhost',
  database: process.env.JELLYSTAT_DB_NAME || 'jfstat',
  password: process.env.JELLYSTAT_DB_PASSWORD || 'jfstat',
  port: parseInt(process.env.JELLYSTAT_DB_PORT || '5432'),
};

async function migrate() {
  console.log('--- Jellystat to Local Tracker Migration ---');
  
  const client = new Client(JELLYSTAT_DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Connected to Jellystat database');

    // Get all instances to know which one to migrate to
    const instances = await (prisma as any).instance.findMany();
    if (instances.length === 0) {
      console.error('No instances found in the new system. Please create an instance first.');
      return;
    }

    console.log('Available instances:');
    instances.forEach((i: any) => console.log(`- ID ${i.id}: ${i.name}`));

    // Default to first instance for now, or let user specify via env
    const targetInstanceId = parseInt(process.env.MIGRATE_INSTANCE_ID || instances[0].id.toString());
    console.log(`\nMigrating data to Instance ID: ${targetInstanceId}`);

    // Fetch history from Jellystat
    console.log('Fetching playback activity from Jellystat...');
    const res = await client.query('SELECT * FROM jf_playback_activity');
    const records = res.rows;
    console.log(`Found ${records.length} records to migrate.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const row of records) {
      try {
        // Check if already exists (using Id from Jellystat as unique check if possible)
        // Since we use UUID for id in EmbyActivityLog, we can try to match by some fields
        // or just import everything.
        
        await (prisma as any).embyActivityLog.create({
          data: {
            instanceId: targetInstanceId,
            embyUserId: row.UserId,
            userName: row.UserName,
            itemId: row.NowPlayingItemId,
            itemName: row.NowPlayingItemName,
            itemType: row.SeriesName ? 'Episode' : 'Movie', // Heuristic
            startTime: new Date(row.ActivityDateInserted),
            endTime: new Date(new Date(row.ActivityDateInserted).getTime() + (row.PlaybackDuration || 0) * 1000),
            playDuration: parseInt(row.PlaybackDuration || '0'),
            totalDuration: null, // Jellystat doesn't store this in activity table usually
            client: row.Client,
            device: row.DeviceName,
            deviceId: row.DeviceId,
            mediaInfo: JSON.stringify({
              seriesName: row.SeriesName,
              seasonId: row.SeasonId,
              episodeId: row.EpisodeId,
              migratedFrom: 'Jellystat'
            })
          }
        });
        migratedCount++;
        if (migratedCount % 100 === 0) console.log(`Progress: ${migratedCount}/${records.length}`);
      } catch (err) {
        // console.error(`Failed to migrate record ${row.Id}:`, err.message);
        skippedCount++;
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`- Successfully migrated: ${migratedCount}`);
    console.log(`- Skipped/Failed: ${skippedCount}`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

migrate();
