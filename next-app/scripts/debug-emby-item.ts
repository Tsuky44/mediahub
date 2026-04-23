
import { getEmbyServiceForUser } from '../lib/auth';
// Jellyfin service might also be in auth or services, let's assume services for now based on recent context or check auth.ts
// Wait, I should check where getJellyfinServiceForUser is.
import { getJellyfinServiceForUser } from '../lib/auth'; 

async function checkItem(itemId: string) {
    console.log(`\nChecking ItemID: ${itemId}...`);

    // 1. Try Emby
    console.log('--- Emby ---');
    try {
        const embyService = await getEmbyServiceForUser();
        if (embyService) {
            try {
                const item = await embyService.getItemDetails(itemId);
                console.log(`[Emby] Found: ${item.Name} (ID: ${item.Id})`);
                console.log('[Emby] ProviderIds:', item.ProviderIds);
            } catch (e: any) {
                console.error(`[Emby] Error: ${e.message}`);
            }
        } else {
            console.log('[Emby] Service not available.');
        }
    } catch (e: any) {
         console.log(`[Emby] Init Error: ${e.message}`);
    }

    // 2. Try Jellyfin
    console.log('--- Jellyfin ---');
    try {
        const jellyfinService = await getJellyfinServiceForUser();
        if (jellyfinService) {
            try {
                const item = await jellyfinService.getItemDetails(itemId);
                console.log(`[Jellyfin] Found: ${item.Name} (ID: ${item.Id})`);
                console.log('[Jellyfin] ProviderIds:', item.ProviderIds);
            } catch (e: any) {
                console.error(`[Jellyfin] Error: ${e.message}`);
            }
        } else {
            console.log('[Jellyfin] Service not available.');
        }
    } catch (e: any) {
        console.log(`[Jellyfin] Init Error: ${e.message}`);
    }
}

async function main() {
            console.log('Starting debug script...');
            await checkItem('42677'); 
            console.log('Finished debug script.');
        }

main();
