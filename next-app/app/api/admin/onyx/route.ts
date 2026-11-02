import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { checkRateLimit, clearRateLimit, registerLoginFailure } from '@/lib/auth/rate-limiter'
import { getOnyxIntegrationConfig } from '@/lib/integrations/onyx-config'
import { deliverOnyxEvent } from '@/lib/integrations/onyx-webhook'
import { setSetting } from '@/lib/settings'
import { OnyxAuthError, normalizeOnyxUrl, onyxLogin, onyxLogout, onyxVerifyOtp, type OnyxLoginResult } from '@/lib/services/onyx-auth'
import {
  clearOnyxServiceSession,
  getOnyxService,
  isOnyxAdmin,
  OnyxService,
  OnyxServiceError,
  saveOnyxServiceSession,
} from '@/lib/services/onyx-admin'

export const dynamic = 'force-dynamic'

/**
 * Liaison MediaHub <-> Onyx, côté administrateur : état, compte de service (connexion avec OTP),
 * écriture de l'adresse et de la clé de MediaHub dans Onyx, test du webhook.
 */

function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
}

async function requireAdmin() {
  const user = await getRealUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  if ((user as { role?: string }).role !== 'admin') return { error: NextResponse.json({ error: 'Accès administrateur requis' }, { status: 403 }) }
  return { user }
}

function hintOf(key: string) {
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`
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
  if (!config.url) return NextResponse.json({ ...base, reachable: false, service: null, onyxSide: null })

  const [info, service] = await Promise.all([serverInfo(config.url), getOnyxService()])
  let serviceState: { username: string; ok: boolean; error?: string } | null = null
  let onyxSide: { mediahubUrl: string; keySet: boolean; keyMatches: boolean | null } | null = null

  if (service) {
    try {
      const [me, settings] = await Promise.all([service.me(), service.getSettings()])
      serviceState = { username: me.username, ok: isOnyxAdmin(me) && !!me.permissions?.manage_users }
      if (!serviceState.ok) serviceState.error = `Le compte « ${me.username} » n'est pas administrateur d'Onyx`
      onyxSide = {
        mediahubUrl: settings.mediahub_url || '',
        keySet: !!settings.mediahub_api_key_set,
        keyMatches: settings.mediahub_api_key_set && config.apiKey ? settings.mediahub_api_key_hint === hintOf(config.apiKey) : null,
      }
    } catch (e) {
      serviceState = { username: service.username, ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  return NextResponse.json({ ...base, ...info, service: serviceState, onyxSide })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const adminId = parseInt(auth.user.id)

  const body = await request.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''

  try {
    switch (action) {
      case 'connect':
        return await connect(request, body, adminId)
      case 'disconnect': {
        await (await getOnyxService())?.logout()
        await clearOnyxServiceSession()
        await logAction(adminId, 'UPDATE_SETTINGS', 'SYSTEM', 'onyx', { message: 'Compte de service Onyx déconnecté' })
        return NextResponse.json({ connected: false })
      }
      case 'link-onyx':
        return await linkOnyx(body, adminId)
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
    if (e instanceof OnyxServiceError) return NextResponse.json({ error: e.message }, { status: e.status === 401 || e.status === 403 ? 409 : 502 })
    throw e
  }
}

/** Ouvre la session du compte de service : { username, password } puis, si Onyx le demande, { challenge, code }. */
async function connect(request: NextRequest, body: Record<string, unknown>, adminId: number) {
  // Adresse saisie dans le formulaire, pas forcément encore enregistrée
  const typedUrl = typeof body.onyxUrl === 'string' ? normalizeOnyxUrl(body.onyxUrl) : ''
  const url = typedUrl || (await getOnyxIntegrationConfig()).url
  if (!url) return NextResponse.json({ error: "Renseignez d'abord l'adresse du serveur Onyx" }, { status: 400 })

  const ip = clientIp(request)
  const subject = `service:${adminId}`
  const rate = await checkRateLimit(ip, subject, 'onyx')
  if (!rate.allowed) return NextResponse.json({ error: `Trop de tentatives. Réessayez dans ${rate.timeLeft} minute(s).` }, { status: 429 })

  let result: OnyxLoginResult
  try {
    if (typeof body.challenge === 'string' && body.challenge) {
      result = await onyxVerifyOtp(url, body.challenge, String(body.code ?? ''))
    } else if (typeof body.username === 'string' && typeof body.password === 'string' && body.username.trim()) {
      result = await onyxLogin(url, body.username.trim(), body.password)
    } else {
      return NextResponse.json({ error: 'Identifiants Onyx requis' }, { status: 400 })
    }
  } catch (e) {
    if (e instanceof OnyxAuthError) {
      await registerLoginFailure(ip, subject, 'onyx')
      return NextResponse.json({ error: e.message }, { status: e.status === 429 ? 429 : 401 })
    }
    throw e
  }

  if (result.kind === 'otp') {
    if (result.setup) {
      return NextResponse.json({ error: "Onyx impose la validation en deux étapes : configurez-la d'abord dans l'application Onyx" }, { status: 400 })
    }
    return NextResponse.json({ otpRequired: true, challenge: result.challenge })
  }

  const service = new OnyxService(url, result.token, result.account.username)
  const me = await service.me()
  if (!isOnyxAdmin(me) || !me.permissions?.manage_users) {
    await onyxLogout(url, result.token)
    return NextResponse.json({ error: `Le compte « ${me.username} » n'est pas administrateur d'Onyx (gestion des utilisateurs et des réglages requise)` }, { status: 403 })
  }

  if (typedUrl) await setSetting('onyx_url', typedUrl)
  await saveOnyxServiceSession(result.token, me.username)
  await clearRateLimit(ip, subject, 'onyx')
  await logAction(adminId, 'UPDATE_SETTINGS', 'SYSTEM', 'onyx', { message: `Compte de service Onyx connecté (${me.username})` })
  return NextResponse.json({ connected: true, username: me.username })
}

/**
 * Écrit dans Onyx l'adresse de MediaHub et la clé d'intégration. Sans clé, MediaHub en crée une
 * et l'enregistre : les deux côtés partagent alors la même.
 */
async function linkOnyx(body: Record<string, unknown>, adminId: number) {
  const service = await getOnyxService()
  if (!service) return NextResponse.json({ error: "Connectez d'abord le compte de service Onyx" }, { status: 400 })

  const mediahubUrl = typeof body.mediahubUrl === 'string' ? body.mediahubUrl.trim().replace(/\/+$/, '') : ''
  if (!/^https?:\/\/[^\s]+$/i.test(mediahubUrl)) {
    return NextResponse.json({ error: 'Adresse de MediaHub invalide (http:// ou https://)' }, { status: 400 })
  }

  const typedKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const config = await getOnyxIntegrationConfig()
  let apiKey = typedKey || config.apiKey
  let generated = false
  if (!apiKey) {
    apiKey = randomBytes(32).toString('hex')
    generated = true
  }
  if (apiKey !== config.apiKey || config.apiKeySource !== 'settings') {
    await setSetting('player_integration_api_key', apiKey)
  }

  await service.linkMediaHub(mediahubUrl, apiKey)
  await logAction(adminId, 'UPDATE_SETTINGS', 'SYSTEM', 'onyx', { message: `Adresse et clé de MediaHub écrites dans Onyx (${mediahubUrl})` })
  return NextResponse.json({ ok: true, apiKey, generated })
}
