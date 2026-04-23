
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for WatchEvent with itemId "14944"...');
    
    const events = await prisma.watchEvent.findMany({
        where: {
            itemId: '14944'
        }
    });

    console.log(`Found ${events.length} events.`);
    
    if (events.length > 0) {
        console.log('Sample event:', JSON.stringify(events[0], null, 2));
    } else {
        console.log('No events found with itemId "14944".');
        
        // Try searching by similar ID or just listing recent events to see structure
        console.log('Listing recent 5 events to check structure...');
        const recent = await prisma.watchEvent.findMany({
            take: 5,
            orderBy: {
                playedAt: 'desc'
            }
        });
        console.log(JSON.stringify(recent, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
