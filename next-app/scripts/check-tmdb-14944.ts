
import { PrismaClient } from '@prisma/client';
import { getTmdbServiceForUser } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking TMDB and WatchEvent for ID "14944"...');

    // Check WatchEvent for tmdbId
    const eventsByTmdb = await prisma.watchEvent.findMany({
        where: {
            tmdbId: '14944'
        }
    });
    console.log(`Found ${eventsByTmdb.length} events with tmdbId "14944".`);

    // Check TMDB for 14944
    const tmdbService = await getTmdbServiceForUser();
    if (tmdbService) {
        try {
            console.log('Checking TMDB for Movie 14944...');
            const movie = await tmdbService.getDetails(14944, 'movie');
            console.log('Movie 14944 found:', movie ? `${movie.title} (${movie.release_date})` : 'No');
        } catch (e) {
            console.log('Movie 14944 not found.');
        }

        try {
            console.log('Checking TMDB for Movie 42677 (Cars 2 Emby ID?)...');
            const movie = await tmdbService.getDetails(42677, 'movie');
            console.log('Movie 42677 found:', movie ? `${movie.title} (${movie.release_date})` : 'No');
        } catch (e) {
            console.log('Movie 42677 not found.');
        }
    } else {
        console.log('Could not get TMDB service.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
