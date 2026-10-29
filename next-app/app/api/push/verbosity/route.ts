/**
 * Volume de notifications de l'appareil courant.
 *
 * Réglage par APPAREIL et non par compte : quelqu'un peut avoir un Android
 * (où les mises à jour sont silencieuses) et un iPhone (où chaque push vibre,
 * `silent` et `renotify` n'y étant pas honorés). Un réglage par compte ne
 * saurait pas traiter ce cas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  setSubscriptionVerbosity,
  getSubscriptionsForUser,
  PUSH_VERBOSITIES,
  type PushVerbosity,
} from '@/lib/push/store'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Liste les appareils de l'utilisateur avec leur volume courant.
 * Le client retrouve le sien en comparant l'endpoint de sa souscription —
 * ça évite de faire transiter cet identifiant dans une query string.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subs = await getSubscriptionsForUser(parseInt(user.id, 10))
    return NextResponse.json({
      devices: subs.map((s) => ({
        endpoint: s.endpoint,
        label: s.deviceLabel,
        verbosity: s.verbosity,
      })),
    })
  } catch (err) {
    logger.error('[Push][verbosity][GET] Échec:', err)
    return NextResponse.json({ error: 'Lecture impossible' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { endpoint?: string; verbosity?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const verbosity = body.verbosity as PushVerbosity
  if (!body.endpoint || !PUSH_VERBOSITIES.includes(verbosity)) {
    return NextResponse.json(
      { error: `endpoint requis, et verbosity parmi ${PUSH_VERBOSITIES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    // On vérifie que l'appareil appartient bien à l'utilisateur : sans ça,
    // connaître un endpoint suffirait à modifier les réglages d'autrui.
    const own = await getSubscriptionsForUser(parseInt(user.id, 10))
    if (!own.some((s) => s.endpoint === body.endpoint)) {
      return NextResponse.json({ error: 'Appareil inconnu sur ce compte' }, { status: 404 })
    }

    await setSubscriptionVerbosity(body.endpoint, verbosity)
    return NextResponse.json({ success: true, verbosity })
  } catch (err) {
    logger.error('[Push][verbosity] Échec:', err)
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  }
}
