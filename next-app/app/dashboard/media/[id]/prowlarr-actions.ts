'use server'

import { getQBittorrentServiceForUser, getProwlarrServiceForUser, getRadarrServiceForUser, getSonarrServiceForUser } from '@/lib/auth'
import { getTmdbServiceForUser } from '@/lib/auth'

import { checkAccess } from '../../downloads/actions'

export async function getSonarrEpisodes(tmdbId: number) {
    try {
        await checkAccess('downloads.view')
        const sonarr = await getSonarrServiceForUser()
        const tmdb = await getTmdbServiceForUser()
        
        if (!sonarr || !tmdb) return { error: 'Services non configurés' }

        // Convert TMDB to TVDB if needed (though Sonarr might use TVDB mostly)
        const externalIds = await tmdb.getExternalIds('tv', tmdbId)
        if (!externalIds?.tvdb_id) return { error: 'TVDB ID introuvable' }

        const series = await sonarr.getSeriesByTvdbId(externalIds.tvdb_id)
        if (!series || !series.id) return { error: 'Série introuvable dans Sonarr' }

        const episodes = await sonarr.getEpisodes(series.id)
        return { episodes }
    } catch (error: any) {
        console.error('Get Sonarr episodes error:', error)
        return { error: error.message }
    }
}

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

        await qbtService.addTorrent(url, [])
        return { success: true }
    } catch (error: any) {
        console.error('Download torrent error:', error)
        return { error: error.message }
    }
}

// --- New Interactive Search Functions ---

export async function searchMediaReleases(
    mediaType: 'movie' | 'tv',
    tmdbId: number,
    tvdbId?: number,
    seasonNumber?: number,
    episodeNumber?: number
) {
    try {
        await checkAccess('downloads.view')
        const prowlarr = await getProwlarrServiceForUser()
        if (!prowlarr) return { error: 'Prowlarr non configuré' }
        
        const tmdbService = await getTmdbServiceForUser()
        if (!tmdbService) return { error: 'Service TMDB non disponible' }

        let query = ''
        let categories: number[] = []

        if (mediaType === 'movie') {
            categories = [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 8000] // Films categories
            
            // Get IMDb ID for better search
            const externalIds = await tmdbService.getExternalIds('movie', tmdbId)
            if (externalIds?.imdb_id) {
                query = `{imdb:${externalIds.imdb_id}}`
            } else {
                query = `{tmdb:${tmdbId}}`
            }
        } 
        else if (mediaType === 'tv') {
            categories = [5000, 5010, 5020, 5030, 5040, 5045, 5050, 5060, 5070, 5080] // TV categories
            
            let targetTvdbId = tvdbId
            if (!targetTvdbId) {
                const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
                targetTvdbId = externalIds?.tvdb_id
            }

            if (!targetTvdbId) return { error: 'TVDB ID introuvable pour cette série' }

            query = `{tvdb:${targetTvdbId}}`
            
            if (typeof seasonNumber === 'number' && typeof episodeNumber === 'number') {
                const s = seasonNumber < 10 ? `0${seasonNumber}` : seasonNumber
                const e = episodeNumber < 10 ? `0${episodeNumber}` : episodeNumber
                query += ` S${s}E${e}` 
            } else if (typeof seasonNumber === 'number') {
                const s = seasonNumber < 10 ? `0${seasonNumber}` : seasonNumber
                query += ` S${s}`
            }
        }

        console.log(`[SmartSearch] Searching Prowlarr directly with query: ${query}`)
        
        const results = await prowlarr.search(query, undefined, categories)
        
        return { 
            results: results.map((r: any) => ({
                guid: r.guid,
                title: r.title,
                size: r.size,
                indexer: r.indexer,
                indexerId: r.indexerId,
                publishDate: r.publishDate,
                seeders: r.seeders,
                leechers: r.leechers,
                age: r.age,
                downloadUrl: r.downloadUrl,
                magnetUrl: r.magnetUrl,
                protocol: r.protocol,
                customFormatScore: 0, // Not available from Prowlarr directly
                rejections: [] // Not available from Prowlarr directly
            }))
        }
    } catch (error: any) {
        console.error('Search media releases error:', error)
        return { error: error.message }
    }
}

export async function downloadMediaRelease(
    guid: string,
    indexerId: number,
    mediaType: 'movie' | 'tv',
    tmdbId: number,
    tvdbId?: number,
    seasonNumber?: number,
    episodeNumber?: number,
    releaseInfo?: {
        title: string
        downloadUrl: string
        protocol: string
        publishDate: string
        indexer: string
        size?: number
        guid?: string
    }
) {
    try {
        await checkAccess('downloads.manage')

        if (mediaType === 'movie') {
            const radarr = await getRadarrServiceForUser()
            if (!radarr) return { error: 'Radarr non configuré' }

            const profiles = await radarr.getProfiles()
            const rootFolders = await radarr.getRootFolders()
            
            await radarr.addMovie({
                tmdbId,
                title: '', 
                qualityProfileId: profiles?.[0]?.id || 1,
                rootFolderPath: rootFolders?.[0]?.path || '',
                year: 0,
                monitored: true,
                minimumAvailability: 'announced',
                searchNow: false
            })

            if (releaseInfo) {
                const res = await radarr.pushRelease(releaseInfo)
                return res
            } else {
                const res = await radarr.downloadRelease(guid, indexerId)
                return res
            }
        }
        else if (mediaType === 'tv') {
            if (!tvdbId) return { error: 'TVDB ID manquant' }
            const sonarr = await getSonarrServiceForUser()
            if (!sonarr) return { error: 'Sonarr non configuré' }

            if (typeof seasonNumber === 'number' && typeof episodeNumber === 'number') {
                await sonarr.monitorEpisode(tvdbId, seasonNumber, episodeNumber)
            } else if (typeof seasonNumber === 'number') {
                await sonarr.monitorSeason(tvdbId, seasonNumber)
            }

            if (releaseInfo) {
                const res = await sonarr.pushRelease(releaseInfo)
                return res
            } else {
                const res = await sonarr.downloadRelease(guid, indexerId)
                return res
            }
        }
        
        return { error: 'Type de média non supporté' }
    } catch (error: any) {
        console.error('Download media release error:', error)
        return { error: error.message }
    }
}
