import crypto from 'crypto'
import { getSetting } from '@/lib/settings'

/** Tolerance sur l'horodatage d'une livraison (sorraa le renouvelle a chaque tentative). */
export const SORRAA_TIMESTAMP_TOLERANCE_S = 5 * 60

/** `sha256=` + hex(HMAC-SHA256(secret, "<timestamp>.<corps brut>")). */
export function signSorraaDelivery(secret: string, timestamp: string, rawBody: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

/**
 * Verifie une livraison sorraa. Sans secret configure, la livraison est refusee :
 * la signature est le seul moyen de l'authentifier.
 */
export async function verifySorraaDelivery(
  headers: Headers,
  rawBody: string,
  now: number = Date.now()
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = await getSetting('webhook_sorraa_secret')
  if (!secret) return { ok: false, reason: 'secret non configure' }

  const timestamp = headers.get('x-sorraa-timestamp')
  const signature = headers.get('x-sorraa-signature')
  if (!timestamp || !signature) return { ok: false, reason: 'en-tetes de signature absents' }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > SORRAA_TIMESTAMP_TOLERANCE_S) {
    return { ok: false, reason: 'horodatage hors tolerance' }
  }

  const expected = Buffer.from(signSorraaDelivery(secret, timestamp, rawBody))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'signature invalide' }
  }
  return { ok: true }
}
