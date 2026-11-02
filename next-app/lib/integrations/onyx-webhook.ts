import { createHmac, randomUUID } from 'crypto'
import { getSetting } from '@/lib/settings'
import { logger } from '@/lib/logger'

export const PLAYER_API_VERSION = 1

export type OnyxEventName =
  | 'webhook.test'
  | 'request.created'
  | 'request.status_changed'
  | 'request.deleted'
  | 'media.imported'

export interface OnyxEnvelope {
  id: string
  event: OnyxEventName
  apiVersion: number
  occurredAt: string
  data: unknown
}

export interface DeliveryResult {
  delivered: boolean
  status?: number
  error?: string
}

const ATTEMPTS = 3
const TIMEOUT_MS = 5000

/** URL d'Onyx (reglage `onyx_webhook_url` ou variable ONYX_WEBHOOK_URL) et cle partagee. */
export async function getOnyxWebhookTarget(): Promise<{ url: string; key: string } | null> {
  const url = (await getSetting('onyx_webhook_url')).trim()
  const key = (process.env.PLAYER_INTEGRATION_API_KEY || '').trim()
  if (!url || !key) return null
  return { url, key }
}

export function signBody(key: string, body: string) {
  return 'sha256=' + createHmac('sha256', key).update(body).digest('hex')
}

/** Envoie un evenement a Onyx, avec reprises. */
export async function deliverOnyxEvent(event: OnyxEventName, data: unknown): Promise<DeliveryResult> {
  const target = await getOnyxWebhookTarget()
  if (!target) return { delivered: false, error: 'not configured' }

  const envelope: OnyxEnvelope = {
    id: randomUUID(),
    event,
    apiVersion: PLAYER_API_VERSION,
    occurredAt: new Date().toISOString(),
    data,
  }
  const body = JSON.stringify(envelope)
  let last: DeliveryResult = { delivered: false }

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${target.key}`,
          'X-MediaHub-Event': event,
          'X-MediaHub-Delivery': envelope.id,
          'X-MediaHub-Signature': signBody(target.key, body),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      last = { delivered: response.ok, status: response.status }
      if (response.ok) return last
      // 4xx (sauf 408/429) : Onyx refuse l'evenement, inutile de le renvoyer.
      if (response.status < 500 && response.status !== 408 && response.status !== 429) break
    } catch (e) {
      last = { delivered: false, error: (e as Error).message }
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
  }
  logger.warn(`[OnyxWebhook] ${event} non livre`, last)
  return last
}

/** Version « tire et oublie » : ne leve jamais et n'attend pas Onyx. */
export function notifyOnyx(event: OnyxEventName, data: unknown) {
  void deliverOnyxEvent(event, data).catch((e) => logger.warn('[OnyxWebhook] erreur inattendue', e))
}
