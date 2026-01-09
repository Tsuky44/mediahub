import { EmbyService } from '../lib/services/emby'
import { JellystatService } from '../lib/services/jellystat'
import { getSetting } from '../lib/settings'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
    console.log('--- API Connectivity Test ---')
    
    const instances = await (prisma as any).instance.findMany()
    if (instances.length === 0) {
        console.log('No instances found in database.')
        return
    }

    const instance = instances[0]
    console.log(`Testing instance: ${instance.name} (${instance.slug})`)

    // 1. Emby
    try {
        console.log(`Emby URL: ${instance.embyUrl}`)
        const embyService = new EmbyService(instance.embyUrl, instance.embyApiKey)
        const sessions = await embyService.getSessions()
        console.log(`Emby Connectivity: SUCCESS (${sessions?.length || 0} sessions found)`)
    } catch (e: any) {
        console.log(`Emby Connectivity: FAILED (${e.message})`)
    }

    // 2. Jellystat
    try {
        const jsUrl = await getSetting('jellystat_url', instance.id)
        const jsKey = await getSetting('jellystat_api_key', instance.id)
        console.log(`Jellystat URL: ${jsUrl || 'Not set'}`)
        console.log(`Jellystat Key: ${jsKey ? 'Set' : 'Not set'}`)
        
        const jellystat = new JellystatService()
        const history = await jellystat.getHistory(5, 0, 30, instance.id)
        console.log(`Jellystat Connectivity: SUCCESS (${history?.length || 0} history items found)`)
    } catch (e: any) {
        console.log(`Jellystat Connectivity: FAILED (${e.message})`)
    }
}

test()
