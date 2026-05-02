import { QBittorrentCache } from './qbittorrent-cache'
import { prisma } from '@/lib/prisma'

const INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface MediaRequestLite {
  id: number
  tmdbId: string | number
  mediaType: string
  title?: string | null
  metadata?: string | null
  requesterName?: string | null
  userId?: number | null
}

// Use a global variable to prevent multiple schedulers in dev mode
const globalForScheduler = global as unknown as { statsSchedulerStarted: boolean }

export function startStatsScheduler() {
    if (globalForScheduler.statsSchedulerStarted) return
    if (process.env.NEXT_RUNTIME === 'edge') return // Don't run on edge

    globalForScheduler.statsSchedulerStarted = true
    console.log('[StatsScheduler] Starting scheduler...')

    // Run immediately
    syncDailyStats()
    checkCompletedDownloads()

    // Run interval
    setInterval(syncDailyStats, INTERVAL_MS)
    setInterval(checkCompletedDownloads, INTERVAL_MS)
}

async function syncDailyStats() {
    try {
        const cache = QBittorrentCache.getInstance()
        if (cache.getLastUpdate() === 0) return // cache not yet initialized

        // --- NEW: Global Stats Sync (User Logic) ---
        try {
            const transferInfo = cache.getGlobalStats()
            if (transferInfo) {
                const totalUp = BigInt(Math.floor(Number(transferInfo.up_info_data ?? 0)))
                const totalDl = BigInt(Math.floor(Number(transferInfo.dl_info_data ?? 0)))
                const tracker = 'GLOBAL'

                // Find last log for GLOBAL to calculate diff
                const lastLog = await prisma.trackerStatsLog.findFirst({
                    where: { tracker },
                    orderBy: { timestamp: 'desc' }
                })

                let diffUp = BigInt(0)
                let diffDl = BigInt(0)

                if (lastLog) {
                    diffUp = totalUp - lastLog.totalUploaded
                    diffDl = totalDl - lastLog.totalDownloaded

                    // User logic: "Si nouveau_total < ancien_total ... consommation = nouveau_total"
                    if (diffUp < 0) diffUp = totalUp
                    if (diffDl < 0) diffDl = totalDl
                } else {
                    // First run ever for GLOBAL
                    // User implies: "session a deja des donner... je devrais les voir"
                    // Treating first run as if previous was 0.
                    // If dl_info_data is session/all-time, this captures the "current counter" as the first diff
                    // which effectively backfills the "current session" into history.
                    diffUp = totalUp
                    diffDl = totalDl
                }

                // Only insert if there is activity or it's a heartbeat (every 5 mins is fine)
                // User wants 5 min logs.
                await prisma.trackerStatsLog.create({
                    data: {
                        tracker,
                        totalUploaded: totalUp,
                        totalDownloaded: totalDl,
                        uploadedDiff: diffUp,
                        downloadedDiff: diffDl
                    }
                })
            }
        } catch (e) {
            console.error('[StatsScheduler] Error syncing global stats:', e)
        }
        // -------------------------------------------

        const torrents = cache.getTorrents('all')
        if (!Array.isArray(torrents)) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Aggregate by tracker
        const trackerStats: Record<string, { uploaded: number, downloaded: number }> = {}

        for (const t of torrents) {
            let trackerDomain = 'Inconnu'
            try {
                if (t.tracker) {
                    const url = new URL(t.tracker.startsWith('udp://') ? t.tracker.replace('udp://', 'http://') : t.tracker)
                    trackerDomain = url.hostname
                }
            } catch (e) {
                trackerDomain = t.tracker || 'Inconnu'
            }

            if (!trackerStats[trackerDomain]) {
                trackerStats[trackerDomain] = { uploaded: 0, downloaded: 0 }
            }

            trackerStats[trackerDomain].uploaded += t.uploaded
            trackerStats[trackerDomain].downloaded += t.downloaded
        }

        // Save to DB
        let updatedCount = 0
        for (const [tracker, stats] of Object.entries(trackerStats)) {
            const totalUp = BigInt(Math.floor(stats.uploaded))
            const totalDl = BigInt(Math.floor(stats.downloaded))

            // 1. Log Logic (New - 5 min interval)
            // Find last log for this tracker to calculate diff
            const lastLog = await prisma.trackerStatsLog.findFirst({
                where: { tracker },
                orderBy: { timestamp: 'desc' }
            })

            let diffUp = BigInt(0)
            let diffDl = BigInt(0)

            if (lastLog) {
                diffUp = totalUp - lastLog.totalUploaded
                diffDl = totalDl - lastLog.totalDownloaded

                // Handle reset (new < old) or negative diff
                // User logic: "Si nouveau_total < ancien_total ... consommation = nouveau_total"
                if (diffUp < 0) diffUp = totalUp
                if (diffDl < 0) diffDl = totalDl
            } else {
                // First run ever for this tracker (or after migration):
                // Try to bridge with existing DailyTrackerStat to avoid losing progress or zeroing out
                const lastDaily = await prisma.dailyTrackerStat.findFirst({
                    where: { tracker },
                    orderBy: { date: 'desc' }
                })

                if (lastDaily) {
                    diffUp = totalUp - lastDaily.totalUploaded
                    diffDl = totalDl - lastDaily.totalDownloaded
                    
                    if (diffUp < 0) diffUp = totalUp
                    if (diffDl < 0) diffDl = totalDl
                } else {
                    // True cold start
                    diffUp = BigInt(0)
                    diffDl = BigInt(0)
                }
            }

            await prisma.trackerStatsLog.create({
                data: {
                    tracker,
                    totalUploaded: totalUp,
                    totalDownloaded: totalDl,
                    uploadedDiff: diffUp,
                    downloadedDiff: diffDl
                }
            })

            // 2. Daily Logic (Old - keep for compatibility for now)
            await prisma.dailyTrackerStat.upsert({
                where: {
                    date_tracker: {
                        date: today,
                        tracker
                    }
                },
                update: {
                    totalUploaded: totalUp,
                    totalDownloaded: totalDl,
                    updatedAt: new Date()
                },
                create: {
                    date: today,
                    tracker,
                    totalUploaded: totalUp,
                    totalDownloaded: totalDl
                }
            })
            updatedCount++
        }
        
        if (updatedCount > 0) {
            console.log(`[StatsScheduler] Synced stats (Log + Daily) for ${updatedCount} trackers`)
        }

    } catch (e) {
        console.error('[StatsScheduler] Error syncing stats:', e)
    }
}

function normalizeTitleForMatch(s: string): string {
    return s
        .toLowerCase()
        .replace(/[._\-\[\](){}]/g, ' ')
        .replace(/\b(2160p|1080p|720p|480p|bluray|blu-ray|webrip|web-dl|webdl|hdtv|x264|x265|h264|h265|hevc|avc|aac|dd5|dts|remux|proper|repack|extended|complete|s\d+e\d+|s\d+)\b/gi, '')
        .replace(/\b\d{4}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function titleMatchesTorrent(requestTitle: string, torrentName: string): boolean {
    if (!requestTitle || !torrentName) return false
    const normalTitle = normalizeTitleForMatch(requestTitle)
    const normalTorrent = normalizeTitleForMatch(torrentName)
    if (normalTitle.length < 2) return false
    return normalTorrent.includes(normalTitle)
}

let downloadCheckIsFirstRun = true

async function checkCompletedDownloads() {
    try {
        const cache = QBittorrentCache.getInstance()
        const torrents = cache.getTorrents('all')
        if (!Array.isArray(torrents)) return

        const completedTorrents = torrents.filter(t => t.progress === 1 && t.completion_on > 0)

        // On every app start: seed all currently completed hashes silently (no notifications)
        // This ensures Docker restarts / updates never spam old completed downloads
        if (downloadCheckIsFirstRun) {
            downloadCheckIsFirstRun = false
            const allHashes = completedTorrents.map(t => t.hash.toLowerCase())
            console.log(`[StatsScheduler] Startup: seeding ${allHashes.length} completed hashes silently`)
            await prisma.setting.upsert({
                where: { key: 'notified_dl_hashes' },
                update: { value: JSON.stringify(allHashes.slice(-500)) },
                create: { key: 'notified_dl_hashes', value: JSON.stringify(allHashes.slice(-500)) }
            })
            return
        }

        if (completedTorrents.length === 0) return

        const [notifiedSetting, hashMapSetting] = await Promise.all([
            prisma.setting.findFirst({ where: { key: 'notified_dl_hashes' } }),
            prisma.setting.findFirst({ where: { key: 'download_hash_map' } })
        ])
        const hashMap: Record<string, { tmdbId: string; mediaType: string; title: string }> =
            hashMapSetting ? JSON.parse(hashMapSetting.value || '{}') : {}

        const notifiedHashes: string[] = notifiedSetting ? JSON.parse(notifiedSetting.value || '[]') : []

        const newCompleted = completedTorrents.filter(t => !notifiedHashes.includes(t.hash.toLowerCase()))
        if (newCompleted.length === 0) return

        // Only match active requests (not yet available) created within the last 60 days
        const cutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        const recentRequests = await prisma.mediaRequest.findMany({
            where: {
                status: { lt: 5 },
                requestedAt: { gte: cutoffDate }
            },
            orderBy: { requestedAt: 'desc' },
            take: 300
        })

        const { ExternalNotificationService } = await import('./external-notification-service')
        const newNotifiedHashes = [...notifiedHashes]

        for (const torrent of newCompleted) {
            const hashKey = torrent.hash.toLowerCase()
            const qualityMatch = torrent.name.match(/\b(2160p|1080p|720p|480p)\b/i)
            const quality = qualityMatch ? qualityMatch[1] : (torrent.category || '')
            const size = torrent.size ? (torrent.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : ''

            // Primary: hash map from Grab webhook (exact match via Radarr/Sonarr)
            const hashEntry = hashMap[hashKey]
            let matchingRequests: MediaRequestLite[] = []

            if (hashEntry) {
                matchingRequests = (recentRequests as MediaRequestLite[]).filter((req) =>
                    req.tmdbId === hashEntry.tmdbId && req.mediaType === hashEntry.mediaType
                )
                if (matchingRequests.length === 0) {
                    // No matching request but we know the media — notify globally without requesterId
                    console.log(`[StatsScheduler] media_downloaded via hash map (no request): ${hashEntry.title} (TMDB ${hashEntry.tmdbId})`)
                    await ExternalNotificationService.send('media_downloaded', {
                        title: hashEntry.title,
                        message: `Le téléchargement de "${hashEntry.title}" est terminé.`,
                        data: {
                            tmdbId: hashEntry.tmdbId,
                            mediaType: hashEntry.mediaType,
                            title: hashEntry.title,
                            quality,
                            size
                        }
                    })
                }
            } else {
                // Fallback: title matching
                matchingRequests = (recentRequests as MediaRequestLite[]).filter((req) =>
                    titleMatchesTorrent(req.title || '', torrent.name)
                )
                if (matchingRequests.length === 0) {
                    console.log(`[StatsScheduler] No match for completed torrent: ${torrent.name}`)
                }
            }

            for (const req of matchingRequests) {
                let posterPath = ''
                let overview = ''
                let year = ''
                let genres = ''
                try {
                    const meta = req.metadata ? JSON.parse(req.metadata) : {}
                    posterPath = meta.posterPath || ''
                    overview = meta.overview || ''
                    year = meta.year || ''
                    genres = meta.genres || ''
                } catch {}

                console.log(`[StatsScheduler] media_downloaded for "${req.title}" via ${hashEntry ? 'hash map' : 'title match'} (torrent: ${torrent.name})`)

                await ExternalNotificationService.send('media_downloaded', {
                    title: req.title || torrent.name,
                    message: `Le téléchargement de "${req.title || torrent.name}" est terminé.`,
                    data: {
                        tmdbId: req.tmdbId,
                        mediaType: req.mediaType,
                        title: req.title || torrent.name,
                        year,
                        overview,
                        posterPath,
                        genres,
                        quality,
                        size,
                        user: req.requesterName || ''
                    }
                }, req.userId ?? undefined)
            }

            newNotifiedHashes.push(hashKey)
        }

        const trimmed = newNotifiedHashes.slice(-500)
        await prisma.setting.upsert({
            where: { key: 'notified_dl_hashes' },
            update: { value: JSON.stringify(trimmed) },
            create: { key: 'notified_dl_hashes', value: JSON.stringify(trimmed) }
        })

    } catch (e) {
        console.error('[StatsScheduler] Error checking completed downloads:', e)
    }
}
