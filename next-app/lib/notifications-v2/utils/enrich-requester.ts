/**
 * enrich-requester.ts
 *
 * Complète les infos d'un `RequesterInfo` (nom, email, whatsappNumber) depuis la
 * table `users` via son `id` lorsqu'elles sont absentes.
 *
 * Certains flux (grouped-availability, anciennes demandes sans requesterName, …)
 * passent un requester avec uniquement l'`id`. Sans enrichissement, le template
 * affiche « Demandé par : inconnu » et la case « notifier le demandeur » ne peut
 * pas résoudre le numéro. On centralise ici la résolution.
 */

import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { RequesterInfo } from '../types'

/**
 * Retourne un `RequesterInfo` enrichi (ou l'original si rien à compléter).
 * Ne fait aucune requête DB si le requester est absent, sans id, ou déjà complet.
 */
export async function enrichRequester(
  requester: RequesterInfo | undefined
): Promise<RequesterInfo | undefined> {
  if (!requester) return requester

  const id = requester.id != null ? Number(requester.id) : null
  if (id == null || isNaN(id)) return requester

  const hasName = !!requester.name && requester.name.trim().length > 0
  const hasEmail = !!requester.email && requester.email.trim().length > 0
  const hasNumber = !!requester.whatsappNumber && requester.whatsappNumber.trim().length > 0

  // Déjà complet → pas de requête DB
  if (hasName && hasEmail && hasNumber) return requester

  try {
    const u = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, name: true, email: true, whatsappNumber: true },
    })
    if (!u) return requester

    return {
      ...requester,
      name: hasName ? requester.name : u.name ?? requester.name,
      email: hasEmail ? requester.email : u.email ?? requester.email,
      whatsappNumber: hasNumber ? requester.whatsappNumber : u.whatsappNumber ?? requester.whatsappNumber,
    }
  } catch (err) {
    console.error('[NotifV2] enrichRequester failed:', err)
    return requester
  }
}
