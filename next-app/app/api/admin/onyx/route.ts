import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { getOnyxIntegrationConfig } from '@/lib/integrations/onyx-config'
import { deliverOnyxEvent } from '@/lib/integrations/onyx-webhook'
import { setSetting } from '@/lib/settings'
import { clearOnyxLibraryCache, getOnyxDirectory, OnyxDirectoryError } from '@/lib/services/onyx-directory'

export const dynamic = 'force-dynamic'

/**
 * Liaison MediaHub <-> Onyx, côté administrateur : état, écriture de l'adresse de MediaHub dans
 * Onyx, rotation de la clé et test du webhook. Tout passe par l'API d'Onyx avec la clé
 * d'intégration (routes /api/integrations/mediahub/* d'Onyx), sans compte Onyx.
 */

async function requireAdmin() {
  const user = await getRealUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if ((user as { role?: string }).role !== 'admin') return { error: NextResponse.json({ error: 'Accès administrateur requis' }, { status: 403 }) }
  return { user }
}

function hintOf(key: string) {
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`
}

function newKey() {
  return randomBytes(32).toString('hex')
}

async function serverInfo(url: string) {
  try {
    const res = await fetch(`${url}/api/ping`, { signal: AbortSignal.timeout(5000), cache: 'no-store' })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.status !== 'ok') return { reachable: false, error: `Cette adresse répond, mais pas comme Onyx (HTTP ${res.status})` }
    return { reachable: true, version: typeof data.version === 'string' ? data.version : null }
  } catch {
    return { reachable: false, error: 'Serveur Onyx injoignable depuis MediaHub' }
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const config = await getOnyxIntegrationConfig()
  const base = {
    url: config.url,
    apiKeySource: config.apiKeySource,
    apiKeyHint: config.apiKey ? hintOf(config.apiKey) : null,
    webhookUrl: config.webhookUrl,
    webhookSource: config.webhookSource,
    fallbackEmail: config.fallbackEmail,
  }
  if (!config.url) return NextResponse.json({ ...base, reachable: false, link: null })

  const [info, directory] = await Promise.all([serverInfo(config.url), getOnyxDirectory()])
  // La clé est acceptée dès qu'Onyx répond : c'est elle qui ouvre la route.
  let link: { ok: boolean; mediahubUrl?: string; error?: string } | null = null
  if (directory) {
    try {
      const state = await directory.link()
      link = { ok: true, mediahubUrl: state.mediahub_url || '' }
    } catch (e) {
      link = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  return NextResponse.json({ ...base, ...info, link })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const adminId = parseInt(auth.user.id)

  const body = await request.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''

  try {
    switch (action) {
      case 'link-onyx':
        return await linkOnyx(body, adminId)
      case 'rotate-key':
        return await rotateKey(adminId)
      case 'test-webhook': {
        const result = await deliverOnyxEvent('webhook.test', { message: 'MediaHub -> Onyx' })
        if (result.delivered) return NextResponse.json({ ok: true, message: 'Onyx a bien reçu l’évènement de test' })
        const reason = result.error === 'not configured'
          ? "Webhook non configuré : renseignez l'adresse d'Onyx et la clé d'intégration"
          : result.status ? `Onyx a répondu HTTP ${result.status}` : `Échec : ${result.error ?? 'inconnu'}`
        return NextResponse.json({ ok: false, error: reason }, { status: 502 })
      }
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (e) {
    if (e instanceof OnyxDirectoryError) return NextResponse.json({ error: e.message }, { status: e.status === 401 || e.status === 404 ? 409 : 502 })
    throw e
  }
}

/**
 * Écrit dans Onyx l'adresse de MediaHub. Onyx n'accepte l'appel qu'avec une clé qu'il connaît déjà :
 * sans clé, MediaHub en crée une et l'enregistre, à copier une fois dans les réglages d'Onyx.
 */
async function linkOnyx(body: Record<string, unknown>, adminId: number) {
  const mediahubUrl = typeof body.mediahubUrl === 'string' ? body.mediahubUrl.trim().replace(/\/+$/, '') : ''
  if (!/^https?:\/\/[^\s]+$/i.test(mediahubUrl)) {
    return NextResponse.json({ error: 'Adresse de MediaHub invalide (http:// ou https://)' }, { status: 400 })
  }

  const config = await getOnyxIntegrationConfig()
  if (!config.url) return NextResponse.json({ error: "Renseignez d'abord l'adresse du serveur Onyx" }, { status: 400 })

  const typedKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  let apiKey = typedKey || config.apiKey
  let generated = false
  if (!apiKey) {
    apiKey = newKey()
    generated = true
  }
  if (apiKey !== config.apiKey || config.apiKeySource !== 'settings') {
    await setSetting('player_integration_api_key', apiKey)
    clearOnyxLibraryCache()
  }

  const directory = await getOnyxDirectory()
  if (!directory) return NextResponse.json({ error: "Clé d'intégration absente" }, { status: 400 })
  try {
    await directory.updateLink({ mediahubUrl })
  } catch (e) {
    // Première liaison : Onyx ne connaît pas encore la clé. L'administrateur la copie dans Onyx.
    if (e instanceof OnyxDirectoryError && e.status === 401) {
      return NextResponse.json({ ok: false, apiKey, generated, needsKeyInOnyx: true, error: e.message }, { status: 409 })
    }
    throw e
  }
  await logAction(adminId, 'UPDATE_SETTINGS', 'SYSTEM', 'onyx', { message: `Adresse de MediaHub écrite dans Onyx (${mediahubUrl})` })
  return NextResponse.json({ ok: true, apiKey, generated })
}

/**
 * Nouvelle clé posée des deux côtés : Onyx la reçoit en présentant l'actuelle, puis MediaHub
 * l'enregistre. Dans cet ordre, un échec chez Onyx laisse les deux sur l'ancienne.
 */
async function rotateKey(adminId: number) {
  const directory = await getOnyxDirectory()
  if (!directory) return NextResponse.json({ error: "Renseignez d'abord l'adresse d'Onyx et une clé acceptée par Onyx" }, { status: 400 })

  const apiKey = newKey()
  await directory.updateLink({ newApiKey: apiKey })
  await setSetting('player_integration_api_key', apiKey)
  clearOnyxLibraryCache()
  await logAction(adminId, 'UPDATE_SETTINGS', 'SYSTEM', 'onyx', { message: "Clé d'intégration Onyx changée des deux côtés" })
  return NextResponse.json({ ok: true, apiKey })
}
