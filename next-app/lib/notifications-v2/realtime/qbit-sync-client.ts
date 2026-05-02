/**
 * QBittorrentSyncClient — lightweight listener that hooks into
 * QBittorrentCache instead of doing its own sync/maindata polling.
 * This prevents duplicate HTTP sessions against qBittorrent WebUI
 * and eliminates double memory state on the qBittorrent daemon side.
 */

import { QBittorrentCache } from '@/lib/services/qbittorrent-cache'

export type OnQbitChange = () => void

export class QBittorrentSyncClient {
  private started = false
  private unsubscribe: (() => void) | null = null

  constructor(private readonly onChange: OnQbitChange) {}

  start(): void {
    if (this.started) return
    this.started = true

    const cache = QBittorrentCache.getInstance()

    // Register as a lightweight listener; Cache already polls qBittorrent.
    cache.addChangeListener(this.handleChange)
    this.unsubscribe = () => cache.removeChangeListener(this.handleChange)

    console.log('[NotificationsV2][QbitSync] Started (cache listener mode)')
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.started = false
  }

  private handleChange = (): void => {
    try {
      this.onChange()
    } catch (err) {
      console.error('[NotificationsV2][QbitSync] onChange handler error:', err)
    }
  }
}
