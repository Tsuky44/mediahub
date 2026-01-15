'use server'

import { getRadarrServiceForUser, getSonarrServiceForUser } from '@/lib/auth'
import { RadarrQueueItem } from '@/lib/services/radarr'
import { SonarrQueueItem } from '@/lib/services/sonarr'

export interface DownloadStatus {
    isDownloading: boolean
    progress: number // 0-100
    timeleft: string
    status: string
    title: string
    size: string
    sizeLeft: string
    speed?: string
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export async function checkDownloadStatus(
    tmdbId: number, 
    mediaType: 'movie' | 'tv', 
    tvdbId?: number,
    mediaTitle?: string // Added title parameter
): Promise<DownloadStatus | null> {
    try {
        console.log(`Checking download status for ${mediaType} TMDB:${tmdbId} TVDB:${tvdbId} Title:${mediaTitle}`)
        if (mediaType === 'movie') {
            const radarr = await getRadarrServiceForUser()
            if (!radarr) {
                console.log('No Radarr service found')
                return null
            }

            const queue = await radarr.getQueue()
            console.log(`Radarr queue length: ${queue.length}`)
            
            // Normalize title for comparison
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
            const targetTitle = mediaTitle ? normalize(mediaTitle) : ''

            // Find queue item matching tmdbId OR title
            const item = queue.find((q: RadarrQueueItem) => {
                const idMatch = q.movie?.tmdbId === tmdbId
                const titleMatch = mediaTitle && q.title && normalize(q.title).includes(targetTitle)
                
                if (idMatch || titleMatch) {
                    console.log(`Match found! ID match: ${idMatch}, Title match: ${titleMatch} for ${q.title}`)
                    return true
                }
                return false
            })

            if (item) {
                console.log('Found matching download:', item.title)
                const totalSize = item.size
                const sizeLeft = item.sizeleft
                const progress = totalSize > 0 ? ((totalSize - sizeLeft) / totalSize) * 100 : 0
                
                return {
                    isDownloading: true,
                    progress: Math.min(Math.round(progress), 100),
                    timeleft: item.timeleft,
                    status: item.status,
                    title: item.title,
                    size: formatBytes(totalSize),
                    sizeLeft: formatBytes(sizeLeft)
                }
            }
        } else if (mediaType === 'tv') {
            if (!tvdbId) return null
            const sonarr = await getSonarrServiceForUser()
            if (!sonarr) return null

            const queue = await sonarr.getQueue()
            
            // Normalize title for comparison
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
            const targetTitle = mediaTitle ? normalize(mediaTitle) : ''

            const item = queue.find((q: SonarrQueueItem) => {
                const idMatch = q.series?.tvdbId === tvdbId
                // Check if either title includes the other to handle year suffixes etc.
                const qTitle = q.series?.title ? normalize(q.series.title) : ''
                const titleMatch = mediaTitle && qTitle && (qTitle.includes(targetTitle) || targetTitle.includes(qTitle))
                
                return idMatch || titleMatch
            })

            if (item) {
                const totalSize = item.size
                const sizeLeft = item.sizeleft
                const progress = totalSize > 0 ? ((totalSize - sizeLeft) / totalSize) * 100 : 0

                return {
                    isDownloading: true,
                    progress: Math.min(Math.round(progress), 100),
                    timeleft: item.timeleft,
                    status: item.status,
                    title: item.episode ? `${item.series?.title} - S${item.episode.seasonNumber}E${item.episode.episodeNumber}` : item.title,
                    size: formatBytes(totalSize),
                    sizeLeft: formatBytes(sizeLeft)
                }
            }
        }

        return null
    } catch (e) {
        console.error('Failed to check download status:', e)
        return null
    }
}
