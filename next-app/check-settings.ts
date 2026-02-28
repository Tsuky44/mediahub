import { prisma } from './lib/prisma';

async function main() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['auth_emby_enabled', 'auth_plex_enabled', 'auth_jellyfin_enabled']
      }
    }
  });
  console.log(JSON.stringify(settings, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
