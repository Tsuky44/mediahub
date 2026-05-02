/**
 * QueuePoller — lightweight REST polling alternative to SignalR.
 * Polls Radarr/Sonarr queue endpoints every N seconds and calls
 * onChange when the queue might have changed.
 *
 * Avoids the ws bundling issues of @microsoft/signalr in Next.js standalone.
 */

import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'

export class QueuePoller {
  private timer: NodeJS.Timeout | null = null
  private lastHash = ''

  constructor(
    private readonly source: 'radarr' | 'sonarr',
    private readonly onChange: () => void,
    private readonly intervalMs = 10_000
  ) {}

  start(): void {
    if (this.timer) return
    this.poll() // immediate first call
    this.timer = setInterval(() => this.poll(), this.intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async poll(): Promise<void> {
    try {
      const items = await (this.source === 'radarr'
        ? this.pollRadarr()
        : this.pollSonarr())

      const hash = this.computeHash(items)
      if (hash !== this.lastHash) {
        this.lastHash = hash
        this.onChange()
      }
    } catch (err) {
      // Silent — queue might be temporarily unreachable. The fallback poll
      // and qBittorrent sync will catch up.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[QueuePoller][${this.source}] Poll failed:`, (err as Error).message)
      }
    }
  }

  private async pollRadarr() {
    const svc = await getRadarrService()
    if (!svc) return []
    return svc.getQueue()
  }

  private async pollSonarr() {
    const svc = await getSonarrService()
    if (!svc) return []
    return svc.getQueue()
  }

  private computeHash(items: { id?: number; status?: string; trackedDownloadState?: string }[]): string {
    // Fast stable hash — only fields that affect progress detection.
    return items
      .map(i => `${i.id}:${i.status}:${i.trackedDownloadState}`)
      .sort()
      .join('|')
  }
}
