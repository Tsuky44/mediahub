/**
 * AvailabilityPoller — polls for media that has just become AVAILABLE
 * on the media server (Emby), by watching `MediaRequest.status` transitions.
 *
 * We snapshot the set of already-notified request IDs in DB and emit
 * MEDIA_AVAILABLE only for newly-available ones.
 */

import { prisma } from '@/lib/prisma'
import { notificationBus } from '../event-bus'
import { ConfigStore } from '../config/config-store'
import { NOTIFICATION_EVENTS } from '../types'

const SEEN_KEY = 'notifications_v2_seen_available_ids'

export class AvailabilityPoller {
  private started = false
  private isFirstRun = true
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly intervalMs = 3 * 60 * 1000) {}

  start(): void {
    if (this.started) return
    this.started = true
    this.tick().catch(() => {})
    this.timer = setInterval(() => this.tick().catch(() => {}), this.intervalMs)
    console.log(`[NotificationsV2][AvailabilityPoller] Started (every ${this.intervalMs / 1000}s)`)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  private async tick(): Promise<void> {
    const config = await ConfigStore.load()
    if (!config.enabled) return

    const availableReqs = await prisma.mediaRequest.findMany({
      where: { status: 5 } as any,
      orderBy: { requestedAt: 'desc' } as any,
      take: 500,
    })

    const seenRow = await prisma.setting.findFirst({ where: { key: SEEN_KEY } })
    const seen: number[] = seenRow?.value ? safeParse(seenRow.value, []) : []

    // Startup seed — silence all currently-available requests.
    if (this.isFirstRun) {
      this.isFirstRun = false
      const ids = availableReqs.map((r) => r.id)
      await this.saveSeen(ids.slice(-1000))
      console.log(`[NotificationsV2][AvailabilityPoller] Startup seed: ${ids.length} silenced`)
      return
    }

    const newlyAvailable = availableReqs.filter((r) => !seen.includes(r.id))
    if (newlyAvailable.length === 0) return

    const newSeen = [...seen]

    for (const req of newlyAvailable as any[]) {
      let meta: any = {}
      try { meta = req.metadata ? JSON.parse(req.metadata) : {} } catch {}

      let requester
      if (req.userId) {
        const user = await prisma.user.findUnique({ where: { id: req.userId } })
        if (user) {
          requester = {
            id: user.id,
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            whatsappNumber: (user as any).whatsappNumber ?? undefined,
          }
        }
      }

      await notificationBus.emit(NOTIFICATION_EVENTS.MEDIA_AVAILABLE, {
        media: {
          tmdbId: req.tmdbId,
          mediaType: req.mediaType,
          title: req.title,
          year: meta.year,
          overview: meta.overview,
          posterPath: meta.posterPath,
          genres: meta.genres,
        },
        requester,
      })

      newSeen.push(req.id)
    }

    await this.saveSeen(newSeen.slice(-1000))
  }

  private async saveSeen(list: number[]): Promise<void> {
    await prisma.setting.upsert({
      where: { key: SEEN_KEY },
      update: { value: JSON.stringify(list) },
      create: { key: SEEN_KEY, value: JSON.stringify(list) },
    })
  }
}

function safeParse<T>(v: string, fallback: T): T {
  try { return JSON.parse(v) } catch { return fallback }
}
