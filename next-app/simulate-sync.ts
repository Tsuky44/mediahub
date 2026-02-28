import { prisma } from './lib/prisma';
import { PlexService } from './lib/services/plex';

async function main() {
  const urlSetting = await prisma.setting.findFirst({ where: { key: 'plex_url' } });
  const tokenSetting = await prisma.setting.findFirst({ where: { key: 'plex_token' } });

  if (!urlSetting?.value || !tokenSetting?.value) {
    console.log('Plex not configured');
    return;
  }

  const plexService = new PlexService(urlSetting.value, tokenSetting.value);
  
  // Mock getUsers since we know what it returns roughly, or fetch it real
  let plexUsers = [];
  try {
      plexUsers = await plexService.getUsers();
      console.log(`Fetched ${plexUsers.length} users from Plex`);
  } catch (e) {
      console.error('Failed to fetch users', e);
      return;
  }

  for (const u of plexUsers) {
      console.log(`Processing ${u.Name} (${u.Id})...`);
      
      try {
        let user = await prisma.user.findFirst({ where: { plexUserId: u.Id } });
        if (!user) {
            user = await prisma.user.findFirst({ where: { name: u.Name } });
        }

        if (user) {
            console.log(`Found existing user ${user.name} (ID: ${user.id})`);
        } else {
            console.log(`Creating new user for ${u.Name}`);
            const email = u.Email || `${u.Name.toLowerCase().replace(/\s+/g, '.')}@plex.local`;
            console.log(`Email: ${email}`);
            
            // Attempt create (dry run or real?)
            // Let's try real create and then delete if needed, or just see if it throws
            const newUser = await prisma.user.create({
                data: {
                    name: u.Name,
                    email: email,
                    plexUserId: u.Id,
                    role: 'user',
                    image: u.Thumb ? (u.Thumb.startsWith('http') ? u.Thumb : plexService.getItemImageUrl(u.Thumb)) : null
                }
            });
            console.log(`Created user ${newUser.name} (ID: ${newUser.id})`);
        }
      } catch (e: any) {
          console.error(`Error processing ${u.Name}:`, e.message);
          if (e.code === 'P2002') {
              console.error('Unique constraint violation:', e.meta?.target);
          }
      }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
