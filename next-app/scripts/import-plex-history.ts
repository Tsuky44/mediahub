import { PrismaClient } from '@prisma/client';
import { importPlexHistory } from '../lib/plex-import';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function run() {
  console.log('--- Starting Plex History Import Script ---');

  try {
    const result = await importPlexHistory(prisma, (data) => {
      console.log(`[Progress] ${data.status} | Total: ${data.total} | Imported: ${data.imported} | Skipped: ${data.skipped}`);
    });

    console.log('\n--- Import Completed ---');
    console.log(`Total imported: ${result.imported}`);
    console.log(`Total skipped: ${result.skipped}`);
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error('Import script failed:', err);
  process.exit(1);
});
