
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Listing recent 10 WatchEvents to inspect data structure...');
    
    try {
        const recent = await prisma.watchEvent.findMany({
            take: 10,
            orderBy: {
                playedAt: 'desc'
            },
            include: {
                user: true
            }
        });

        console.log('Recent Events:');
        recent.forEach(e => {
            console.log(`- Item: "${e.itemName}"`);
            console.log(`  itemId: ${e.itemId} (Type: ${typeof e.itemId})`);
            console.log(`  tmdbId: ${e.tmdbId} (Type: ${typeof e.tmdbId})`);
            console.log(`  source: ${e.source}`);
            console.log(`  providerId: ${e.providerId}`);
            console.log('---');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
