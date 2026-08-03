/**
 * Recipient Resolver — détermine à qui envoyer une notification.
 * Extrait de l'ancien EvolutionListener pour respecter SRP.
 */

import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { inArray, eq } from 'drizzle-orm'
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
  /** IDs des users déjà couverts via targetUserIds — pour éviter le doublon avec notifyRequester. */
  const coveredUserIds = new Set<number>()

  // 1) Raw phone numbers (targetNumbers)
  for (const n of route.targetNumbers) {
    if (n && n.trim()) recipients.add(normalizeNumber(n))
  }

  // 2) Resolve user IDs → whatsappNumber from DB
  const ids = (route.targetUserIds ?? [])
    .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
    .filter((id): id is number => typeof id === 'number' && !isNaN(id))
  if (ids.length > 0) {
    try {
      const usersList = await db.query.users.findMany({
        where: inArray(users.id, ids),
        columns: { id: true, whatsappNumber: true, name: true, email: true },
      })
      for (const u of usersList) {
        if (u.whatsappNumber && u.whatsappNumber.trim()) {
          recipients.add(normalizeNumber(u.whatsappNumber))
          coveredUserIds.add(u.id)
        } else {
          console.warn(`[NotifV2] User #${u.id} (${u.name || u.email}) has no whatsappNumber`)
        }
      }
    } catch (err) {
      console.error('[NotifV2] Failed to resolve targetUserIds:', err)
    }
  }

  // 3) Requester (if opted-in)
  // Le numéro du demandeur peut venir de l'objet `requester` OU être résolu
  // depuis la DB via son `id`. Certains flux (ex: grouped-availability) passent
  // un requester avec uniquement l'id, sans whatsappNumber — on le rattrape ici
  // pour que la case "notifier le demandeur" fonctionne de façon fiable.
  const requesterId = requester?.id != null ? Number(requester.id) : null
  let requesterNumber = requester?.whatsappNumber?.trim() || undefined
  let requesterNumberFromDb = false

  if (
    route.notifyRequester &&
    !requesterNumber &&
    requesterId != null &&
    !isNaN(requesterId) &&
    !coveredUserIds.has(requesterId)
  ) {
    try {
      const u = await db.query.users.findFirst({
        where: eq(users.id, requesterId),
        columns: { id: true, whatsappNumber: true },
      })
      if (u?.whatsappNumber && u.whatsappNumber.trim()) {
        requesterNumber = u.whatsappNumber.trim()
        requesterNumberFromDb = true
      }
    } catch (err) {
      console.error('[NotifV2] Failed to resolve requester whatsappNumber from DB:', err)
    }
  }

  // Skip if the requester is already covered via targetUserIds OR if their number is already in the Set
  // (e.g. the requester's number was added via targetNumbers) — évite le doublon dans les deux cas
  const requesterAlreadyCovered =
    (requesterId != null && coveredUserIds.has(requesterId)) ||
    (requesterNumber != null && recipients.has(normalizeNumber(requesterNumber)))
  if (route.notifyRequester && requesterNumber && !requesterAlreadyCovered) {
    recipients.add(normalizeNumber(requesterNumber))
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
    `requesterId=${requesterId ?? ''}`,
    `requesterAlreadyCovered=${requesterAlreadyCovered}`,
    `requesterHasNumber=${!!requesterNumber}`,
    `requesterNumberFromDb=${requesterNumberFromDb}`,
    `fallbackUsed=${usedFallback}`,
    `resolved=${Array.from(recipients).join(',')}`,
  ].join(' ')

  return { recipients, logInfo }
}

/** Normalise un numéro de téléphone : extrait uniquement les chiffres pour une déduplication parfaite. */
function normalizeNumber(n: string): string {
  return n.replace(/[^\d]/g, '')
}
