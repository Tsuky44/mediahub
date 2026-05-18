/**
 * QbitWatchPoller — surveille les torrents spécifiques dans qBittorrent.
 *
 * Logique :
 *   1. Le QueuePoller (Radarr/Sonarr) peuple activeWatches quand un download
 *      dépasse 60% (sizeleft/size < 0.4).
 *   2. Ce poller poll qBit toutes les 10s, uniquement pour les hashes connus.
 *   3. Quand torrent.progress >= 1 → dispatch MEDIA_DOWNLOAD_COMPLETE.
 */

import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { logger } from '@/lib/logger'
import { dispatch } from '../dispatcher'
import { NOTIFICATION_EVENTS } from '../types'
import type { MediaInfo, RequesterInfo } from '../types'

export interface WatchEntry {
  requestId: number
  hash: string
  media: MediaInfo
  requester?: RequesterInfo
}

export class QbitWatchPoller {
  /** hash → WatchEntry */
  private watches = new Map<string, WatchEntry>()
  private timer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(private readonly intervalMs = 10_000) {}

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        logger.error('[NotifV2][QbitWatchPoller] Tick error:', err)
      )
    }, this.intervalMs)
    logger.info('[NotifV2][QbitWatchPoller] Started')
  }

  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.watches.clear()
    logger.info('[NotifV2][QbitWatchPoller] Stopped')
  }

  /**
   * Appelé par le QueuePoller quand un download dépasse 60%.
   * Idempotent — si le hash est déjà surveillé, ignore.
   */
  addWatch(entry: WatchEntry): void {
    const key = entry.hash.toLowerCase()
    if (this.watches.has(key)) return
    this.watches.set(key, entry)
    logger.info(
      `[NotifV2][QbitWatchPoller] Watching torrent ${key} for req #${entry.requestId} (${entry.media.title})`
    )
  }

  /**
   * Retire un torrent de la surveillance (après dispatch ou annulation).
   */
  removeWatch(hash: string): void {
    this.watches.delete(hash.toLowerCase())
  }

  get activeCount(): number {
    return this.watches.size
  }

  private async tick(): Promise<void> {
    if (this.watches.size === 0) return

    let qbit
    try {
      qbit = await getQBittorrentService()
      if (!qbit) return
    } catch {
      return
    }

    const hashes = Array.from(this.watches.keys())

    let torrents: Array<{ hash: string; progress: number; state: string }> = []
    try {
      const all = await qbit.getTorrents('all')
      if (!Array.isArray(all)) return
      // Filtrer uniquement les hashes surveillés
      torrents = all.filter((t) => hashes.includes(t.hash.toLowerCase()))
    } catch (err) {
      logger.warn('[NotifV2][QbitWatchPoller] Failed to fetch torrents:', (err as Error).message)
      return
    }

    for (const torrent of torrents) {
      const key = torrent.hash.toLowerCase()
      const entry = this.watches.get(key)
      if (!entry) continue

      logger.debug(
        `[NotifV2][QbitWatchPoller] ${entry.media.title} → progress=${(torrent.progress * 100).toFixed(1)}% state=${torrent.state}`
      )

      if (torrent.progress >= 1) {
        logger.info(
          `[NotifV2][QbitWatchPoller] Torrent ${key} complete → dispatching MEDIA_DOWNLOAD_COMPLETE`
        )
        // Retire immédiatement pour éviter le double-dispatch
        this.watches.delete(key)

        const result = await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOAD_COMPLETE, {
          media: entry.media,
          requester: entry.requester,
          download: {
            releaseName: torrent.hash,
          },
        })

        if (result.wasDuplicate) {
          logger.info(`[NotifV2][QbitWatchPoller] Duplicate MEDIA_DOWNLOAD_COMPLETE for req #${entry.requestId}`)
        } else if (result.success) {
          logger.info(`[NotifV2][QbitWatchPoller] MEDIA_DOWNLOAD_COMPLETE dispatched for req #${entry.requestId}`)
        } else {
          logger.error(`[NotifV2][QbitWatchPoller] Failed to dispatch for req #${entry.requestId}: ${result.error}`)
        }
      }
    }

    // Nettoyer les watches pour les torrents qui ont disparu de qBit (importés/supprimés)
    const foundHashes = new Set(torrents.map((t) => t.hash.toLowerCase()))
    for (const hash of hashes) {
      if (!foundHashes.has(hash)) {
        const entry = this.watches.get(hash)
        if (entry) {
          logger.info(
            `[NotifV2][QbitWatchPoller] Torrent ${hash} no longer in qBit (imported?) — removing watch for req #${entry.requestId}`
          )
          this.watches.delete(hash)
        }
      }
    }
  }
}
