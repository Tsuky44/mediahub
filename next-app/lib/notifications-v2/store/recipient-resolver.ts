/**
 * Recipient Resolver — détermine à qui envoyer une notification.
 * Extrait de l'ancien EvolutionListener pour respecter SRP.
 */

import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import type { ConfigStore } from '../config/config-store'
import type { NotificationsV2Config, NotificationEvent, RequesterInfo } from '../types'

export interface ResolvedRecipients {
  recipients: Set<string>
  logInfo: string
}

/**
 * Résout les destinataires pour un event donné selon la config.
 */
export async function resolveRecipients(
  config: NotificationsV2Config,
  event: NotificationEvent,
  requester: RequesterInfo | undefined,
  defaultNumber: string | undefined
): Promise<ResolvedRecipients> {
  const route = config.events[event]
  if (!route || !route.enabled) {
    return { recipients: new Set(), logInfo: 'Route disabled or not configured' }
  }

  const recipients = new Set<string>()

  // 1) Raw phone numbers (targetNumbers)
  for (const n of route.targetNumbers) {
    if (n && n.trim()) recipients.add(n.trim())
  }

  // 2) Resolve user IDs → whatsappNumber from DB
  const ids = (route.targetUserIds ?? []).filter((id): id is number => typeof id === 'number')
  if (ids.length > 0) {
    try {
      const usersList = await db.query.users.findMany({
        where: inArray(users.id, ids),
        columns: { id: true, whatsappNumber: true, name: true, email: true },
      })
      for (const u of usersList) {
        if (u.whatsappNumber && u.whatsappNumber.trim()) {
          recipients.add(u.whatsappNumber.trim())
        } else {
          console.warn(`[NotifV2] User #${u.id} (${u.name || u.email}) has no whatsappNumber`)
        }
      }
    } catch (err) {
      console.error('[NotifV2] Failed to resolve targetUserIds:', err)
    }
  }

  // 3) Requester (if opted-in and number available)
  if (route.notifyRequester && requester?.whatsappNumber) {
    recipients.add(requester.whatsappNumber)
  }

  // 4) Fallback to default number only if nothing else is set
  const usedFallback = recipients.size === 0 && defaultNumber && defaultNumber.trim()
  if (usedFallback) {
    recipients.add(defaultNumber.trim())
  }

  const logInfo = [
    `targetUserIds=[${route.targetUserIds?.join(',') ?? ''}]`,
    `targetNumbers=[${route.targetNumbers?.join(',') ?? ''}]`,
    `notifyRequester=${route.notifyRequester}`,
    `requesterHasNumber=${!!requester?.whatsappNumber}`,
    `fallbackUsed=${usedFallback}`,
    `resolved=${Array.from(recipients).join(',')}`,
  ].join(' ')

  return { recipients, logInfo }
}
