'use server'

import { getQBittorrentServiceForUser } from '@/lib/services/qbittorrent'
import { getProwlarrServiceForUser } from '@/lib/services/prowlarr'
import { checkAccess } from '../../downloads/actions'

export async function searchProwlarr(query: string, indexerIds?: number[], categories?: number[], limit: number = 200, offset: number = 0) {
    try {
        await checkAccess('downloads.view')
        const prowlarrService = await getProwlarrServiceForUser()
        if (!prowlarrService) return { error: 'Prowlarr non configuré' }

        const results = await prowlarrService.search(query, indexerIds, categories, limit, offset)
        return { results }
    } catch (error: any) {
        console.error('Search prowlarr error:', error)
        return { error: error.message }
    }
}

export async function getProwlarrIndexers() {
    try {
        await checkAccess('downloads.view')
        const prowlarrService = await getProwlarrServiceForUser()
        if (!prowlarrService) return { error: 'Prowlarr non configuré' }

        const indexers = await prowlarrService.getIndexers()
        return { indexers }
    } catch (error: any) {
        console.error('Get prowlarr indexers error:', error)
        return { error: error.message }
    }
}

export async function downloadTorrent(url: string) {
    try {
        await checkAccess('downloads.manage')
        const qbtService = await getQBittorrentServiceForUser()
        if (!qbtService) return { error: 'QBittorrent non configuré' }

        await qbtService.addTorrent(url, null)
        return { success: true }
    } catch (error: any) {
        console.error('Download torrent error:', error)
        return { error: error.message }
    }
}
