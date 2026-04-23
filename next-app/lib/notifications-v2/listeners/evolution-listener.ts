/**
 * EvolutionListener — subscribes to the event bus and dispatches
 * each event to the Evolution provider.
 *
 * Separation of concerns:
 *  - EventBus: routing
 *  - ConfigStore: settings source of truth
 *  - TemplateRenderer: message composition
 *  - EvolutionProvider: transport
 *  - Listener: glue (no business logic beyond "should I send?")
 */

import { prisma } from '@/lib/prisma'
import { notificationBus } from '../event-bus'
import { ConfigStore } from '../config/config-store'
import { EvolutionProvider } from '../providers/evolution-provider'
import { TemplateRenderer } from '../templates/template-renderer'
import { ALL_EVENTS } from '../types'
import type { NotificationEventPayload, MessageProvider } from '../types'

export class EvolutionListener {
  private disposers: Array<() => void> = []
  private started = false

  start(): void {
    if (this.started) return
    this.started = true

    for (const ev of ALL_EVENTS) {
      const off = notificationBus.on(ev, (payload) => this.handle(payload))
      this.disposers.push(off)
    }

    console.log('[NotificationsV2][EvolutionListener] Started')
  }

  stop(): void {
    this.disposers.forEach(d => d())
    this.disposers = []
    this.started = false
  }

  private async handle(payload: NotificationEventPayload): Promise<void> {
    let config
    try {
      config = await ConfigStore.load()
    } catch (err) {
      console.error('[NotificationsV2][EvolutionListener] Failed to load config:', err)
      return
    }

    if (!config.enabled) return

    const route = config.events[payload.event]
    if (!route || !route.enabled) return

    const recipients = await this.resolveRecipients(route, config.evolution.defaultNumber, payload)
    if (recipients.size === 0) {
      console.log(
        `[NotificationsV2][EvolutionListener] No recipients for ${payload.event} (${payload.correlationId})`
      )
      return
    }

    const text = TemplateRenderer.render(payload, route.template)
    const mediaUrl = buildPosterUrl(payload.media.posterPath)

    const provider: MessageProvider = new EvolutionProvider(config.evolution, config.retry)

    const results = await Promise.allSettled(
      Array.from(recipients).map(async (to) => {
        const result = await provider.send({ to, text, mediaUrl })
        if (!result.success) {
          console.error(
            `[NotificationsV2][EvolutionListener] Send failed to ${to} (${payload.event}):`,
            result.error
          )
        } else {
          console.log(
            `[NotificationsV2][EvolutionListener] Sent ${payload.event} to ${to} (attempts=${result.attempts})`
          )
        }
        return result
      })
    )

    // Optional: aggregate metrics here.
    void results
  }

  private async resolveRecipients(
    route: { targetUserIds?: number[]; targetNumbers: string[]; notifyRequester: boolean },
    defaultNumber: string | undefined,
    payload: NotificationEventPayload
  ): Promise<Set<string>> {
    const out = new Set<string>()

    // 1) Raw phone numbers
    for (const n of route.targetNumbers) {
      if (n && n.trim()) out.add(n.trim())
    }

    // 2) Resolve user IDs → whatsappNumber from DB
    const ids = (route.targetUserIds ?? []).filter((id): id is number => typeof id === 'number')
    if (ids.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, whatsappNumber: true, name: true, email: true },
        })
        for (const u of users) {
          if (u.whatsappNumber && u.whatsappNumber.trim()) {
            out.add(u.whatsappNumber.trim())
          } else {
            console.warn(
              `[NotificationsV2][EvolutionListener] User #${u.id} (${u.name || u.email}) has no whatsappNumber`
            )
          }
        }
      } catch (err) {
        console.error('[NotificationsV2][EvolutionListener] Failed to resolve users:', err)
      }
    }

    // 3) Requester (if opted-in and number available)
    if (route.notifyRequester && payload.requester?.whatsappNumber) {
      out.add(payload.requester.whatsappNumber)
    }

    // 4) Fallback to default number only if nothing else is set.
    if (out.size === 0 && defaultNumber && defaultNumber.trim()) {
      out.add(defaultNumber.trim())
    }

    return out
  }
}

function buildPosterUrl(posterPath?: string): string | undefined {
  if (!posterPath) return undefined
  if (/^https?:\/\//i.test(posterPath)) return posterPath
  const clean = posterPath.startsWith('/') ? posterPath : `/${posterPath}`
  return `https://image.tmdb.org/t/p/w500${clean}`
}
