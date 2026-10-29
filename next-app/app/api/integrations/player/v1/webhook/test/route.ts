import { NextResponse } from 'next/server'
import { apiError, authenticate } from '@/lib/integrations/player-v1'
import { deliverOnyxEvent, getOnyxWebhookTarget } from '@/lib/integrations/onyx-webhook'

export const dynamic = 'force-dynamic'

/** Envoie un evenement `webhook.test` a Onyx pour verifier la liaison sortante. */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (auth.ability.cannot('manage_settings', 'Settings')) return apiError(403, 'Forbidden')

  if (!(await getOnyxWebhookTarget())) {
    return NextResponse.json({ ok: false, error: 'Webhook non configuré (onyx_webhook_url / ONYX_WEBHOOK_URL)' }, { status: 409 })
  }
  const result = await deliverOnyxEvent('webhook.test', { message: 'MediaHub -> Onyx' })
  return NextResponse.json({ ok: result.delivered, status: result.status ?? null, error: result.error ?? null }, { status: result.delivered ? 200 : 502 })
}
