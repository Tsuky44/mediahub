/**
 * DownloadPoller — polls qBittorrent for newly-completed torrents
 * and emits MEDIA_IMPORTING. Replaces Radarr/Sonarr "Download" webhooks.
 *
 * Matching strategy (no webhooks):
 *  - We rely on an external hash→tmdbId mapping (from the legacy v1 webhooks or future Grab capture).
 *  - If no mapping, we do a best-effort title match against recent requests.
 *  - On startup: seed silently to avoid spamming historical completions.
 */

import { prisma } from '@/lib/prisma'
import { notificationBus } from '../event-bus'
import { ConfigStore } from '../config/config-store'
import { NOTIFICATION_EVENTS } from '../types'
import type { MediaInfo } from '../types'

const HASH_MAP_KEY = 'download_hash_map'          // shared with v1 (read-only here)
const SEEN_KEY = 'notifications_v2_seen_dl_hashes'

export class DownloadPoller {
  private started = false
  private isFirstRun = true
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly intervalMs = 5 * 60 * 1000) {}

  start(): void {
    if (this.started) return
    this.started = true
    this.tick().catch(() => {})
    this.timer = setInterval(() => this.tick().catch(() => {}), this.intervalMs)
    console.log(`[NotificationsV2][DownloadPoller] Started (every ${this.intervalMs / 1000}s)`)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  private async tick(): Promise<void> {
    const config = await ConfigStore.load()
    if (!config.enabled) return

    // Lazy import to avoid bundling server-only deps in edge runtimes.
    const { getQBittorrentService } = await import('@/lib/services/qbittorrent')
    const qbt = await getQBittorrentService()
    if (!qbt) return

    const torrents = await qbt.getTorrents('all')
    if (!Array.isArray(torrents)) return

    const completed = torrents.filter((t: any) => t.progress === 1 && t.completion_on > 0)

    // Startup seed: avoid spamming existing completions (Docker restart safety).
    if (this.isFirstRun) {
      this.isFirstRun = false
      const hashes = completed.map((t: any) => String(t.hash).toLowerCase())
      await this.saveSeen(hashes.slice(-500))
      console.log(`[NotificationsV2][DownloadPoller] Startup seed: ${hashes.length} hashes silenced`)
      return
    }

    if (completed.length === 0) return

    const [seenRow, mapRow] = await Promise.all([
      prisma.setting.findFirst({ where: { key: SEEN_KEY } }),
      prisma.setting.findFirst({ where: { key: HASH_MAP_KEY } }),
    ])
    const seen: string[] = seenRow?.value ? safeParse(seenRow.value, []) : []
    const hashMap: Record<string, { tmdbId: string; mediaType: string; title: string }> =
      mapRow?.value ? safeParse(mapRow.value, {}) : {}

    const newlyDone = completed.filter((t: any) => !seen.includes(String(t.hash).toLowerCase()))
    if (newlyDone.length === 0) return

    // Only match active requests (not yet available) from last 60 days.
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const requests = await prisma.mediaRequest.findMany({
      where: { status: { lt: 5 }, requestedAt: { gte: cutoff } } as any,
      orderBy: { requestedAt: 'desc' } as any,
      take: 300,
    })

    const newSeen = [...seen]

    for (const torrent of newlyDone) {
      const hashKey = String(torrent.hash).toLowerCase()
      const entry = hashMap[hashKey]
      const quality = matchQuality(torrent.name) ?? torrent.category ?? ''
      const size = torrent.size
        ? (torrent.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        : ''

      let media: MediaInfo | null = null
      let requester: { id: number; name?: string; email?: string; whatsappNumber?: string } | undefined

      if (entry) {
        const req = requests.find(
          (r: any) => r.tmdbId === entry.tmdbId && r.mediaType === entry.mediaType
        ) as any
        media = await this.buildMediaInfo(entry.tmdbId, entry.mediaType as any, entry.title, req)
        requester = await this.loadRequester(req)
      } else {
        // Fallback: title matching
        const req = requests.find((r: any) => titleMatches(r.title, torrent.name)) as any
        if (!req) {
          newSeen.push(hashKey)
          console.log(`[NotificationsV2][DownloadPoller] No match for: ${torrent.name}`)
          continue
        }
        media = await this.buildMediaInfo(req.tmdbId, req.mediaType, req.title, req)
        requester = await this.loadRequester(req)
      }

      if (media) {
        notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_IMPORTING, {
          media,
          requester,
          download: { quality, size, releaseName: torrent.name },
        })
      }

      newSeen.push(hashKey)
    }

    await this.saveSeen(newSeen.slice(-500))
  }

  private async saveSeen(list: string[]): Promise<void> {
    await prisma.setting.upsert({
      where: { key: SEEN_KEY },
      update: { value: JSON.stringify(list) },
      create: { key: SEEN_KEY, value: JSON.stringify(list) },
    })
  }

  private async buildMediaInfo(
    tmdbId: string,
    mediaType: 'movie' | 'tv',
    fallbackTitle: string,
    req?: any
  ): Promise<MediaInfo> {
    let meta: any = {}
    try { meta = req?.metadata ? JSON.parse(req.metadata) : {} } catch {}

    return {
      tmdbId,
      mediaType,
      title: req?.title ?? fallbackTitle,
      year: meta.year,
      overview: meta.overview,
      posterPath: meta.posterPath,
      genres: meta.genres,
    }
  }

  private async loadRequester(req: any | undefined) {
    if (!req?.userId) return undefined
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) return undefined
    return {
      id: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      whatsappNumber: (user as any).whatsappNumber ?? undefined,
    }
  }
}

function titleMatches(requestTitle: string, torrentName: string): boolean {
  if (!requestTitle || !torrentName) return false
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[._\-\[\](){}]/g, ' ')
      .replace(
        /\b(2160p|1080p|720p|480p|bluray|blu-ray|webrip|web-dl|webdl|hdtv|x264|x265|h264|h265|hevc|avc|aac|dd5|dts|remux|proper|repack|extended|complete|s\d+e\d+|s\d+)\b/gi,
        ''
      )
      .replace(/\b\d{4}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const a = normalize(requestTitle)
  const b = normalize(torrentName)
  return a.length >= 2 && b.includes(a)
}

function matchQuality(name: string): string | null {
  const m = name.match(/\b(2160p|1080p|720p|480p)\b/i)
  return m ? m[1] : null
}

function safeParse<T>(v: string, fallback: T): T {
  try { return JSON.parse(v) } catch { return fallback }
}
