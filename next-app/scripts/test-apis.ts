import { embyService } from '../lib/services/emby'
import { JellystatService } from '../lib/services/jellystat'
import { getSetting } from '../lib/settings'

async function test() {
    console.log('--- API Connectivity Test ---')
    
    // 1. Emby
    try {
        const embyUrl = await getSetting('emby_url')
        console.log(`Emby URL: ${embyUrl || 'Not set'}`)
        const sessions = await embyService.getSessions()
        console.log(`Emby Connectivity: SUCCESS (${sessions?.length || 0} sessions found)`)
    } catch (e: any) {
        console.log(`Emby Connectivity: FAILED (${e.message})`)
    }

    // 2. Jellystat
    try {
        const jsUrl = await getSetting('jellystat_url')
        const jsKey = await getSetting('jellystat_api_key')
        console.log(`Jellystat URL: ${jsUrl || 'Not set'}`)
        console.log(`Jellystat Key: ${jsKey ? 'Set' : 'Not set'}`)
        
        const jellystat = new JellystatService()
        const history = await jellystat.getHistory(5)
        console.log(`Jellystat Connectivity: SUCCESS (${history?.length || 0} history items found)`)
    } catch (e: any) {
        console.log(`Jellystat Connectivity: FAILED (${e.message})`)
    }

    // 3. Jellyseerr (via embyService or direct)
    // Actually, recentRequests comes from Prisma local DB, but synced from Jellyseerr
}

test()
