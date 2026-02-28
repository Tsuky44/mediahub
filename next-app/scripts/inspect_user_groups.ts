
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Inspecting user_group_members...');
  
  try {
    // Use $queryRaw to bypass the schema validation error
    const members = await prisma.$queryRaw`SELECT * FROM user_group_members`;
    console.log('Found members:', members);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        embyUserId: true,
        jellyfinUserId: true,
        plexUserId: true,
        jellyseerrUserId: true,
      }
    });
    
    console.log(`Found ${users.length} users.`);

    // Check mapping
    for (const member of members as any[]) {
      const userId = member.user_id;
      // check if userId is already an number
      if (!isNaN(Number(userId))) {
        console.log(`Member ${member.id}: user_id ${userId} is already a number (or number-like).`);
        continue;
      }

      console.log(`Member ${member.id}: user_id "${userId}" is a string. Looking for match...`);
      
      const user = users.find(u => 
        u.embyUserId === userId || 
        u.jellyfinUserId === userId || 
        u.plexUserId === userId ||
        u.jellyseerrUserId === userId
      );

      if (user) {
        console.log(`  -> Found matching user: ID ${user.id} (External: ${userId})`);
      } else {
        console.log(`  -> NO MATCHING USER FOUND for ${userId}`);
      }
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
