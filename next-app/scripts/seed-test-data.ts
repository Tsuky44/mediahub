import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Test Data ---');

  // 1. Create a session
  const sessionId = 'test-session-id';
  
  console.log(`Creating session with ID ${sessionId}`);
  await (prisma as any).embyLiveSession.upsert({
    where: { 
      sessionId
    },
    update: {},
    create: {
      sessionId,
      userId: 'user1',
      userName: 'User 1',
      itemName: 'Movie 1',
      itemType: 'Movie',
      isPaused: false,
    },
  });

  // 2. Add some activity logs
  console.log('Adding activity logs...');
  await (prisma as any).embyActivityLog.create({
    data: {
      embyUserId: 'user1',
      userName: 'User 1',
      itemId: 'item1',
      itemName: 'Movie 1',
      itemType: 'Movie',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      playDuration: 3600,
    }
  });

  console.log('--- Seed Complete ---');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
