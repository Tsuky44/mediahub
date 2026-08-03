import { NextRequest } from 'next/server'
import { getSetting } from '@/lib/settings'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Vérifie si la requête contient un secret de webhook valide
 * Compare le paramètre de requête `?secret=` ou le header `X-Webhook-Secret`
 * avec le secret attendu configuré en base de données.
 * 
 * Si aucun secret n'est configuré pour cette clé, la requête est acceptée (compatibilité descendante),
 * mais un warning est enregistré pour inciter l'utilisateur à configurer la sécurité.
 */
export async function verifyWebhookSecret(req: NextRequest, secretKey: string): Promise<boolean> {
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')
  const headerSecret = req.headers.get('x-webhook-secret')

  const receivedSecret = querySecret || headerSecret

  const expectedSecret = await getSetting(secretKey)
  if (!expectedSecret) {
    logger.warn(`[Webhook Auth] Aucun secret configuré pour '${secretKey}'. Le webhook est temporairement accepté sans vérification.`);
    return true
  }

  if (!receivedSecret) {
    return false
  }

  try {
    const receivedBuffer = Buffer.from(receivedSecret)
    const expectedBuffer = Buffer.from(expectedSecret)
    
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false
    }
    
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch (e) {
    logger.error(`[Webhook Auth] Erreur lors de la comparaison du secret pour '${secretKey}':`, e)
    return false
  }
}
