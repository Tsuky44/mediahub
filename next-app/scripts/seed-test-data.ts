import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Test Data ---');

  // 1. Create or get Instance 1
  const instance1 = await (prisma as any).instance.upsert({
    where: { name: 'Instance 1' },
    update: {},
    create: {
      name: 'Instance 1',
      slug: 'instance-1',
      embyUrl: 'http://instance1:8096',
      embyApiKey: 'key1',
      type: 'emby'
    },
  });
  console.log(`Created Instance 1: ID ${instance1.id}`);

  // 2. Create or get Instance 2
  const instance2 = await (prisma as any).instance.upsert({
    where: { name: 'Instance 2' },
    update: {},
    create: {
      name: 'Instance 2',
      slug: 'instance-2',
      embyUrl: 'http://instance2:8096',
      embyApiKey: 'key2',
      type: 'emby'
    },
  });
  console.log(`Created Instance 2: ID ${instance2.id}`);

  // 3. Create a Plex Instance
  const plexInstance = await (prisma as any).instance.upsert({
    where: { name: 'Plex Test' },
    update: {},
    create: {
      name: 'Plex Test',
      slug: 'plex-test',
      plexUrl: 'http://plex:32400',
      plexToken: 'plex-token',
      type: 'plex'
    },
  });
  console.log(`Created Plex Instance: ID ${plexInstance.id}`);

  // 3. Create a session for Instance 1
  const sessionId = 'shared-session-id';
  
  console.log(`Creating session for Instance 1 with ID ${sessionId}`);
  await (prisma as any).embyLiveSession.upsert({
    where: { 
      sessionId_instanceId: { 
        sessionId, 
        instanceId: instance1.id 
      } 
    },
    update: {},
    create: {
      instanceId: instance1.id,
      sessionId,
      userId: 'user1',
      userName: 'User 1',
      itemName: 'Movie 1',
      itemType: 'Movie',
      isPaused: false,
    },
  });

  // 4. Create a session for Instance 2 with SAME sessionId
  console.log(`Creating session for Instance 2 with SAME ID ${sessionId}`);
  await (prisma as any).embyLiveSession.upsert({
    where: { 
      sessionId_instanceId: { 
        sessionId, 
        instanceId: instance2.id 
      } 
    },
    update: {},
    create: {
      instanceId: instance2.id,
      sessionId,
      userId: 'user2',
      userName: 'User 2',
      itemName: 'Movie 2',
      itemType: 'Movie',
      isPaused: false,
    },
  });

  // 5. Check if both sessions exist
  const sessionCount = await (prisma as any).embyLiveSession.count();
  console.log(`Total live sessions: ${sessionCount} (Should be 2)`);

  const sessions = await (prisma as any).embyLiveSession.findMany();
  for (const s of sessions) {
    console.log(`- Instance ${s.instanceId}: Session ${s.sessionId} for ${s.userName} playing ${s.itemName}`);
  }

  // 6. Add some activity logs
  console.log('Adding activity logs...');
  await (prisma as any).embyActivityLog.create({
    data: {
      instanceId: instance1.id,
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

  await (prisma as any).embyActivityLog.create({
    data: {
      instanceId: instance2.id,
      embyUserId: 'user2',
      userName: 'User 2',
      itemId: 'item2',
      itemName: 'Movie 2',
      itemType: 'Movie',
      startTime: new Date(Date.now() - 1800000),
      endTime: new Date(),
      playDuration: 1800,
    }
  });

  console.log('--- Seed Complete ---');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
