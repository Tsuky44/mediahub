import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up Main Instance ---');

  const embyUrl = process.env.EMBY_URL || 'http://localhost:8096';
  const embyApiKey = process.env.EMBY_API_KEY || '';
  const plexUrl = process.env.PLEX_URL || '';
  const plexToken = process.env.PLEX_TOKEN || '';
  const jellyfinUrl = process.env.JELLYFIN_URL || '';
  const jellyfinApiKey = process.env.JELLYFIN_API_KEY || '';
  const tmdbApiKey = process.env.TMDB_API_KEY || '';
  const jellyseerrUrl = process.env.JELLYSEERR_URL || '';
  const jellyseerrApiKey = process.env.JELLYSEERR_API_KEY || '';

  if (!embyApiKey && !plexToken && !jellyfinApiKey) {
    console.warn('Warning: No server API keys (Emby/Plex/Jellyfin) set in .env');
  }

  // Create or update the 'main' instance
  const mainInstance = await (prisma as any).instance.upsert({
    where: { slug: 'main' },
    update: {
      name: 'Serveur Principal',
      embyUrl,
      embyApiKey,
      plexUrl,
      plexToken,
      jellyfinUrl,
      jellyfinApiKey,
      jellyseerrUrl,
      jellyseerrApiKey,
      isDefault: true,
    },
    create: {
      name: 'Serveur Principal',
      slug: 'main',
      embyUrl,
      embyApiKey,
      plexUrl,
      plexToken,
      jellyfinUrl,
      jellyfinApiKey,
      jellyseerrUrl,
      jellyseerrApiKey,
      isDefault: true,
    },
  });

  console.log(`Main instance set up: ID ${mainInstance.id}, Slug: ${mainInstance.slug}`);

  // Set TMDB API Key in settings for this instance
  if (tmdbApiKey) {
    await (prisma as any).setting.upsert({
      where: {
        key_instanceId: {
          key: 'tmdb_api_key',
          instanceId: mainInstance.id,
        },
      },
      update: { value: tmdbApiKey },
      create: {
        key: 'tmdb_api_key',
        value: tmdbApiKey,
        instanceId: mainInstance.id,
      },
    });
    console.log('TMDB API Key saved in settings.');
  }

  console.log('--- Setup Complete ---');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
