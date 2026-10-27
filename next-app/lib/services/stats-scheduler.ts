import { QBittorrentCache } from './qbittorrent-cache'
import { db } from '@/lib/db/drizzle'
import { settings, mediaRequests } from '@/lib/db/schema'
import { eq, and, lt, gte, desc } from 'drizzle-orm'

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
    checkCompletedDownloads()

    // Run interval
    setInterval(checkCompletedDownloads, INTERVAL_MS)
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
            await upsertSetting('notified_dl_hashes', JSON.stringify(allHashes.slice(-500)))
            return
        }

        if (completedTorrents.length === 0) return

        const [notifiedSetting, hashMapSetting] = await Promise.all([
            db.query.settings.findFirst({ where: eq(settings.key, 'notified_dl_hashes') }),
            db.query.settings.findFirst({ where: eq(settings.key, 'download_hash_map') })
        ])
        const hashMap: Record<string, { tmdbId: string; mediaType: string; title: string }> =
            hashMapSetting ? JSON.parse(hashMapSetting.value || '{}') : {}

        const notifiedHashes: string[] = notifiedSetting ? JSON.parse(notifiedSetting.value || '[]') : []

        const newCompleted = completedTorrents.filter(t => !notifiedHashes.includes(t.hash.toLowerCase()))
        if (newCompleted.length === 0) return

        // Only match active requests (not yet available) created within the last 60 days
        const cutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        const recentRequests = await db.query.mediaRequests.findMany({
            where: and(lt(mediaRequests.status, 5), gte(mediaRequests.requestedAt, cutoffDate)),
            orderBy: [desc(mediaRequests.requestedAt)],
            limit: 300
        })

        // V1 notifications supprimées - plus d'ExternalNotificationService
        // const { ExternalNotificationService } = await import('./external-notification-service')
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
                    // No matching request but we know the media - V1 notifications supprimées
                    console.log(`[StatsScheduler] media_downloaded via hash map (no request): ${hashEntry.title} (TMDB ${hashEntry.tmdbId}) - V1 notifications removed`)
                    // await ExternalNotificationService.send('media_downloaded', {
                    //     title: hashEntry.title,
                    //     message: `Le téléchargement de "${hashEntry.title}" est terminé.`,
                    //     data: {
                    //         tmdbId: hashEntry.tmdbId,
                    //         mediaType: hashEntry.mediaType,
                    //         title: hashEntry.title,
                    //         quality,
                    //         size
                    //     }
                    // })
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

                // V1 notifications supprimées - plus d'envoi de notifications
                console.log(`[StatsScheduler] V1 notifications removed - would send notification for: ${req.title || torrent.name}`)
                // await ExternalNotificationService.send('media_downloaded', {
                //     title: req.title || torrent.name,
                //     message: `Le téléchargement de "${req.title || torrent.name}" est terminé.`,
                //     data: {
                //         tmdbId: req.tmdbId,
                //         mediaType: req.mediaType,
                //         title: req.title || torrent.name,
                //         year,
                //         overview,
                //         posterPath,
                //         genres,
                //         quality,
                //         size,
                //         user: req.requesterName || ''
                //     }
                // }, req.userId ?? undefined)
            }

            newNotifiedHashes.push(hashKey)
        }

        const trimmed = newNotifiedHashes.slice(-500)
        await upsertSetting('notified_dl_hashes', JSON.stringify(trimmed))

    } catch (e) {
        console.error('[StatsScheduler] Error checking completed downloads:', e)
    }
}

async function upsertSetting(key: string, value: string) {
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) })
    if (existing) {
        await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key))
    } else {
        await db.insert(settings).values({ key, value, category: 'system', createdAt: new Date(), updatedAt: new Date() })
    }
}
