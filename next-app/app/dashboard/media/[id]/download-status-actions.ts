'use server'

import { getRadarrServiceForUser, getSonarrServiceForUser, getQBittorrentServiceForUser } from '@/lib/auth'
import { RadarrQueueItem } from '@/lib/services/radarr'
import { SonarrQueueItem, SonarrSeries, SonarrSeason } from '@/lib/services/sonarr'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export interface SeasonInfo {
    seasonNumber: number
    status: 'Downloaded' | 'Downloading' | 'Missing' | 'Partial'
    progress?: number // if downloading
    quality?: string
    size?: string
    language?: string
    dateAdded?: string
    timeleft?: string
    releaseTitle?: string
    isSeasonPack?: boolean
}

export interface DownloadStatus {
    isDownloading: boolean
    progress: number // 0-100
    timeleft: string
    status: string
    title: string // This seems to be used for release title in some cases or media title
    releaseTitle?: string // Explicit release title
    size: string
    sizeLeft: string
    speed?: string
    quality?: string
    dateAdded?: string
    language?: string
    seasons?: SeasonInfo[]
}

function formatTime(seconds: number) {
    if (seconds === 8640000) return '∞' // qBit infinite
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    const parts = []
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    if (parts.length === 0) parts.push(`${s}s`)
    
    return parts.join(' ')
}

function formatSpeed(bytesPerSec: number) {
    return `${formatBytes(bytesPerSec)}/s`
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
        log(`Checking download status for ${mediaType} TMDB:${tmdbId} TVDB:${tvdbId} Title:${mediaTitle}`)
        if (mediaType === 'movie') {
            const radarr = await getRadarrServiceForUser()
            if (!radarr) {
                log('No Radarr service found')
                return null
            }

            // Get internal Radarr ID for the movie
            const radarrMovie = await radarr.getMovieByTmdbId(tmdbId)
            
            const queue = await radarr.getQueue()
            log(`Radarr queue length: ${queue.length}`)
            
            // Normalize title for comparison
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
            const targetTitle = mediaTitle ? normalize(mediaTitle) : ''
            
            // Find queue item matching internal ID
            let item: RadarrQueueItem | undefined
            
            if (radarrMovie && radarrMovie.id) {
                item = queue.find((q: RadarrQueueItem) => q.movieId === radarrMovie.id)
            }

            // Fallback: Match by title if ID match fails (unlikely if movie found)
            if (!item && targetTitle) {
                item = queue.find((q: RadarrQueueItem) => {
                    if (q.title) {
                        const qTitle = normalize(q.title) // This is release title usually, but worth checking
                        // Also check if movie title is inside release title
                        if (qTitle.includes(targetTitle)) return true
                    }
                    return false
                })
            }

            if (item) {
                log('Found item in Radarr queue:', item.id, item.title)
                // Check if we can get better stats from qBittorrent
                let qbitStats = null
                
                try {
                    const qbit = await getQBittorrentServiceForUser()
                    if (qbit) {
                        const torrents = await qbit.getTorrents()
                        
                        // 1. Try match by hash (downloadId)
                        if (item.downloadId) {
                            const downloadId = item.downloadId
                            const torrent = torrents.find(t => t.hash.toLowerCase() === downloadId.toLowerCase())
                            if (torrent) {
                                log('Matched qBit torrent by hash:', torrent.name)
                                qbitStats = {
                                    progress: torrent.progress * 100,
                                    timeleft: torrent.eta > 0 ? formatTime(torrent.eta) : '∞',
                                    speed: formatSpeed(torrent.dlspeed),
                                    seeds: torrent.num_seeds,
                                    peers: torrent.num_leechs,
                                    state: torrent.state,
                                    size: torrent.size,
                                    downloaded: torrent.downloaded
                                }
                            }
                        }

                        // 2. Fallback: Match by Title
                        if (!qbitStats && item.title) {
                            // item.title might be Movie Title or Release Name
                            // qBit torrent.name is Release Name
                            // We check if torrent name contains the item title, or is equal to it
                            const titleToMatch = normalize(item.title)
                            
                            const torrent = torrents.find(t => {
                                const tName = normalize(t.name)
                                return tName.includes(titleToMatch) || titleToMatch.includes(tName)
                            })
                            
                            if (torrent) {
                                log('Matched qBit torrent by name (loose):', torrent.name)
                                qbitStats = {
                                    progress: torrent.progress * 100,
                                    timeleft: torrent.eta > 0 ? formatTime(torrent.eta) : '∞',
                                    speed: formatSpeed(torrent.dlspeed),
                                    seeds: torrent.num_seeds,
                                    peers: torrent.num_leechs,
                                    state: torrent.state,
                                    size: torrent.size,
                                    downloaded: torrent.downloaded
                                }
                            }
                        }
                    }
                } catch (e) {
                    error('Failed to fetch qbit stats:', e)
                }

                // log('Found matching download:', item.title)
                const totalSize = qbitStats?.size || item.size
                const sizeLeft = qbitStats ? (qbitStats.size - qbitStats.downloaded) : item.sizeleft
                const progress = qbitStats?.progress ?? (totalSize > 0 ? ((totalSize - sizeLeft) / totalSize) * 100 : 0)
                
                return {
                    isDownloading: true,
                    progress: Math.min(Math.round(progress), 100),
                    timeleft: qbitStats?.timeleft || item.timeleft,
                    status: qbitStats?.state || item.status,
                    title: item.title, // This is the release title from queue
                    releaseTitle: item.title,
                    size: formatBytes(totalSize),
                    sizeLeft: formatBytes(sizeLeft),
                    speed: qbitStats?.speed
                }
            }

            // Check if movie exists and has file
            const movie = await radarr.getMovieByTmdbId(tmdbId)
            if (movie && movie.hasFile && movie.movieFile) {
                return {
                    isDownloading: false,
                    progress: 100,
                    timeleft: '',
                    status: 'Downloaded',
                    title: movie.title,
                    releaseTitle: movie.movieFile.sceneName || movie.movieFile.relativePath,
                    size: formatBytes(movie.movieFile.size),
                    sizeLeft: '0 B',
                    quality: movie.movieFile.quality.quality.name,
                    dateAdded: new Date(movie.movieFile.dateAdded).toLocaleDateString(),
                    language: movie.movieFile.languages.map(l => l.name).join(', ')
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

            // Map queue items to seasons
            const downloadingSeasons = new Map<number, SonarrQueueItem>()
            
            const sonarrSeries = await sonarr.getSeriesByTvdbId(tvdbId)

            // Find queue item matching tvdbId
            // Note: A queue item might be a season pack or an episode
            // We'll filter relevant items first
            let relevantQueueItems: SonarrQueueItem[] = []

            if (sonarrSeries && sonarrSeries.id) {
                relevantQueueItems = queue.filter((q: SonarrQueueItem) => q.seriesId === sonarrSeries.id)
            }

            if (relevantQueueItems.length === 0) {
                relevantQueueItems = queue.filter((q: SonarrQueueItem) => {
                    // Try to match by TVDB ID first (legacy check if seriesId missing)
                    if (q.series?.tvdbId && (q.series.tvdbId === tvdbId || q.series.tvdbId == tvdbId)) {
                        return true
                    }

                    // Fallback: Match by title
                    if (targetTitle && q.series?.title) {
                        const qTitle = normalize(q.series.title)
                        if (qTitle === targetTitle) return true
                        if (qTitle.includes(targetTitle) || targetTitle.includes(qTitle)) return true
                    }

                    return false
                })
            }

            // Populate downloadingSeasons map
            relevantQueueItems.forEach(item => {
                if (item.episode?.seasonNumber) {
                     downloadingSeasons.set(item.episode.seasonNumber, item)
                }
                // If it's a season pack, it might not have episode.seasonNumber directly, 
                // but usually Sonarr breaks it down or has season identifier. 
                // For now we assume episode.seasonNumber is available or we can't map it easily.
            })

            // Check if series exists and has files
            const series = await sonarr.getSeriesByTvdbId(tvdbId) as SonarrSeries | null
            let seasons: SeasonInfo[] = []
            
            if (series) {
                // Fetch episode files for details
                const files = await sonarr.getEpisodeFiles(series.id!) // series.id is defined if found
                
                // Group files by season
                const filesBySeason = new Map<number, typeof files>()
                files.forEach(f => {
                    const existing = filesBySeason.get(f.seasonNumber) || []
                    existing.push(f)
                    filesBySeason.set(f.seasonNumber, existing)
                })

                // Pre-fetch qBittorrent data if needed
                let qbitTorrents: any[] = []
                if (downloadingSeasons.size > 0) {
                     try {
                         const qbit = await getQBittorrentServiceForUser()
                         if (qbit) {
                             qbitTorrents = await qbit.getTorrents()
                         }
                     } catch (e) {
                         error('Failed to fetch qbit stats for TV:', e)
                     }
                }

                // Iterate through all seasons known to Sonarr (or files)
                // We'll use series.seasons which contains stats
                seasons = series.seasons
                    .filter(s => s.seasonNumber > 0) // Skip specials if needed, or keep them
                    .map(s => {
                        const seasonFiles = filesBySeason.get(s.seasonNumber) || []
                        const downloadingItem = downloadingSeasons.get(s.seasonNumber)
                        
                        let status: SeasonInfo['status'] = 'Missing'
                        let progress = 0
                        let timeleft = ''
                        
                        // Determine status
                        if (downloadingItem) {
                            status = 'Downloading'
                            
                            // Check for qBittorrent stats for this specific item
                            let qbitStats = null
                            if (downloadingItem.downloadId) {
                                const downloadId = downloadingItem.downloadId
                                const torrent = qbitTorrents.find((t: any) => t.hash.toLowerCase() === downloadId.toLowerCase())
                                if (torrent) {
                                    qbitStats = {
                                        progress: torrent.progress * 100,
                                        timeleft: torrent.eta > 0 ? formatTime(torrent.eta) : '∞',
                                        speed: formatSpeed(torrent.dlspeed),
                                        size: torrent.size,
                                        downloaded: torrent.downloaded
                                    }
                                }
                            }

                            // Fallback: Match by title
                            if (!qbitStats && downloadingItem.title) {
                                const titleToMatch = normalize(downloadingItem.title)
                                const torrent = qbitTorrents.find((t: any) => {
                                    const tName = normalize(t.name)
                                    return tName.includes(titleToMatch) || titleToMatch.includes(tName)
                                })
                                
                                if (torrent) {
                                    qbitStats = {
                                        progress: torrent.progress * 100,
                                        timeleft: torrent.eta > 0 ? formatTime(torrent.eta) : '∞',
                                        speed: formatSpeed(torrent.dlspeed),
                                        size: torrent.size,
                                        downloaded: torrent.downloaded
                                    }
                                }
                            }

                            const total = qbitStats?.size || downloadingItem.size
                            const left = qbitStats ? (qbitStats.size - qbitStats.downloaded) : downloadingItem.sizeleft
                            progress = qbitStats?.progress ?? (total > 0 ? ((total - left) / total) * 100 : 0)
                            timeleft = qbitStats?.timeleft || downloadingItem.timeleft
                        } else if (s.statistics?.percentOfEpisodes === 100) {
                            status = 'Downloaded'
                        } else if ((s.statistics?.percentOfEpisodes || 0) > 0) {
                            status = 'Partial'
                        }

                        // Aggregate file info
                        const totalSize = seasonFiles.reduce((acc, f) => acc + f.size, 0)
                        
                        // Get unique qualities
                        const uniqueQualities = Array.from(new Set(seasonFiles.map(f => f.quality.quality.name)))
                        const qualityStr = uniqueQualities.length > 2
                            ? `${uniqueQualities.slice(0, 2).join(', ')}...` 
                            : uniqueQualities.join(', ')
                        
                        // Get unique languages
                        const uniqueLanguages = Array.from(new Set(seasonFiles.flatMap(f => f.languages.map(l => l.name))))
                        const languageStr = uniqueLanguages.join(', ')

                        // Latest date added
                        const latestDate = seasonFiles.length > 0 
                            ? seasonFiles.reduce((latest, f) => {
                                const date = new Date(f.dateAdded)
                                return date > latest ? date : latest
                              }, new Date(0))
                            : null
                        
                        // Try to find a representative release title
                        let releaseTitle = downloadingItem?.title
                        if (!releaseTitle && seasonFiles.length > 0) {
                             releaseTitle = seasonFiles[0].sceneName || seasonFiles[0].relativePath
                        }

                        // Determine if it's likely a season pack
                        let isSeasonPack = false
                        if (releaseTitle) {
                            const episodePattern = /[sS]\d+[eE]\d+|[eE]\d+|\d+x\d+/
                            const hasEpisodeMarker = episodePattern.test(releaseTitle)
                            const hasFileExtension = /\.(mkv|mp4|avi|ts|m4v)$/i.test(releaseTitle)
                            const hasSeasonMarker = /[sS]\d+|Season\s*\d+/i.test(releaseTitle)
                            const hasComplete = /COMPLETE|FULL|PACK/i.test(releaseTitle)
                            
                            // It's a pack if:
                            // 1. It has a season marker but NO episode marker
                            // 2. OR it has the "COMPLETE" keyword
                            // AND it's not just a file with an extension
                            if (((hasSeasonMarker && !hasEpisodeMarker) || hasComplete) && !hasFileExtension) {
                                isSeasonPack = true
                            }
                        }

                        return {
                            seasonNumber: s.seasonNumber,
                            status,
                            progress: Math.min(Math.round(progress), 100),
                            timeleft,
                            quality: qualityStr || (status === 'Downloading' ? '...' : ''),
                            size: formatBytes(totalSize),
                            language: languageStr,
                            dateAdded: latestDate ? latestDate.toLocaleDateString() : undefined,
                            releaseTitle,
                            isSeasonPack
                        }
                    })
                    .sort((a, b) => a.seasonNumber - b.seasonNumber)
            }

            // Global download status (if any season is downloading)
            const isAnyDownloading = relevantQueueItems.length > 0
            const totalQueueSize = relevantQueueItems.reduce((acc, i) => acc + i.size, 0)
            const totalQueueLeft = relevantQueueItems.reduce((acc, i) => acc + i.sizeleft, 0)
            const globalProgress = totalQueueSize > 0 ? ((totalQueueSize - totalQueueLeft) / totalQueueSize) * 100 : 0

            // If we found the series or have download items
            if (series || isAnyDownloading) {
                return {
                    isDownloading: isAnyDownloading,
                    progress: Math.min(Math.round(globalProgress), 100),
                    timeleft: relevantQueueItems[0]?.timeleft || '',
                    status: isAnyDownloading ? 'Downloading' : (seasons.every(s => s.status === 'Downloaded') ? 'Downloaded' : 'Partial'),
                    title: series?.title || mediaTitle || 'Unknown Series',
                    size: formatBytes(totalQueueSize), // This is queue size, maybe misleading if downloaded?
                    sizeLeft: formatBytes(totalQueueLeft),
                    seasons: seasons,
                    releaseTitle: relevantQueueItems.length > 0 ? relevantQueueItems[0].title : undefined // Fallback for global status
                }
            }
        }
    } catch (e) {
        error('Error checking download status:', e)
        return null
    }

    return null
}
