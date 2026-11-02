import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/integrations/player-v1'
import { getOnyxWebhookTarget, PLAYER_API_VERSION } from '@/lib/integrations/onyx-webhook'
import { VersionService } from '@/lib/services/version'

export const dynamic = 'force-dynamic'

const FEATURES = [
  'catalog',
  'media-detail',
  'availability',
  'availability-batch',
  'requests-create',
  'my-requests',
  'all-requests',
  'request-detail',
  'request-feed',
  'request-moderation',
  'request-delete',
  'webhook-events',
]

/** Verifie la cle d'integration et rend ce que MediaHub sait du compte presente. */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response

  const { user, ability, userId } = auth
  return NextResponse.json({
    status: 'ok',
    service: 'mediahub',
    version: VersionService.getCurrentVersion(),
    apiVersion: PLAYER_API_VERSION,
    features: FEATURES,
    webhookConfigured: (await getOnyxWebhookTarget()) !== null,
    user: {
      linked: userId !== null,
      id: userId,
      name: user.name,
      role: user.role,
      can: {
        read: ability.can('read', 'Media'),
        request: ability.can('create', 'MediaRequest'),
        readAllRequests: ability.can('read', 'MediaRequest'),
        moderate: ability.can('update', 'MediaRequest'),
        delete: ability.can('delete', 'MediaRequest'),
      },
    },
  })
}
