import { getTmdbServiceForUser } from '../lib/auth';

async function main() {
    const tmdbService = await getTmdbServiceForUser();
    if (tmdbService) {
        const results = await tmdbService.searchMulti('Cars 2');
        console.log('Results:', results?.results?.slice(0, 3).map((r: any) => `${r.title || r.name} (${r.id}) - ${r.media_type}`));
    }
}
main();