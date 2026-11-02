/**
 * Client de l'authentification d'un serveur Onyx (serveur Go).
 * Contrat : docs/player-integration/v1/onyx-login-contract.md
 *
 * MediaHub n'a besoin de la session Onyx que pour lire le compte : il la
 * ferme (logout) dès que l'identité est connue.
 */

export interface OnyxAccount {
  /** Id stable du compte Onyx, en texte (users.onyx_user_id). */
  id: string
  username: string
  avatar: string | null
}

export type OnyxLoginResult =
  | { kind: 'ok'; token: string; account: OnyxAccount }
  | { kind: 'otp'; challenge: string; setup: boolean }

export type OnyxPollResult =
  | { kind: 'pending' }
  | { kind: 'expired' }
  | { kind: 'ok'; token: string; account: OnyxAccount }

export class OnyxAuthError extends Error {
  constructor(message: string, readonly status: number = 0) {
    super(message)
    this.name = 'OnyxAuthError'
  }
}

const TIMEOUT_MS = 10_000

export function normalizeOnyxUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : trimmed ? `http://${trimmed}` : ''
}

interface OnyxUserBody { id?: unknown; username?: unknown; avatar?: unknown }

function toAccount(user: OnyxUserBody | undefined): OnyxAccount {
  const id = user?.id
  if ((typeof id !== 'number' && typeof id !== 'string') || id === '' || typeof user?.username !== 'string') {
    throw new OnyxAuthError("Réponse Onyx invalide (compte sans id)")
  }
  return { id: String(id), username: user.username, avatar: typeof user.avatar === 'string' && user.avatar ? user.avatar : null }
}

async function post(baseUrl: string, path: string, body: unknown, token?: string) {
  let res: Response
  try {
    res = await fetch(`${normalizeOnyxUrl(baseUrl)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    })
  } catch {
    throw new OnyxAuthError("Serveur Onyx injoignable")
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, any>
  return { status: res.status, data }
}

function failure(status: number, data: Record<string, any>, fallback: string): OnyxAuthError {
  if (status === 429) return new OnyxAuthError(data.error || 'Trop de tentatives sur Onyx, réessayez dans un moment', status)
  return new OnyxAuthError(typeof data.error === 'string' && data.error ? data.error : fallback, status)
}

function sessionResult(status: number, data: Record<string, any>, fallback: string): OnyxLoginResult {
  if (status === 200 && typeof data.token === 'string') {
    return { kind: 'ok', token: data.token, account: toAccount(data.user) }
  }
  if (status === 401 && data.otp && typeof data.otp.challenge === 'string') {
    return { kind: 'otp', challenge: data.otp.challenge, setup: data.otp.setup === true }
  }
  throw failure(status, data, fallback)
}

/** POST /api/auth/login. Peut demander une 2e étape (kind: 'otp'). */
export async function onyxLogin(baseUrl: string, username: string, password: string): Promise<OnyxLoginResult> {
  const { status, data } = await post(baseUrl, '/api/auth/login', { username, password })
  return sessionResult(status, data, "Nom d'utilisateur ou mot de passe Onyx incorrect")
}

/** POST /api/auth/otp/login : termine une connexion arrêtée par une étape OTP. */
export async function onyxVerifyOtp(baseUrl: string, challenge: string, code: string): Promise<OnyxLoginResult> {
  const { status, data } = await post(baseUrl, '/api/auth/otp/login', { challenge, code: code.trim() })
  if (status === 410) throw new OnyxAuthError('Étape de vérification expirée, reconnectez-vous', status)
  const result = sessionResult(status, data, 'Code de vérification incorrect')
  if (result.kind !== 'ok') throw new OnyxAuthError('Étape de vérification inattendue', status)
  return result
}

/** POST /api/auth/device/start : un code à valider depuis une app Onyx connectée. */
export async function onyxDeviceStart(baseUrl: string, deviceName = 'MediaHub') {
  const { status, data } = await post(baseUrl, '/api/auth/device/start', { device_name: deviceName })
  if (status !== 200 || typeof data.device_code !== 'string' || typeof data.user_code !== 'string') {
    throw failure(status, data, "Impossible de démarrer l'appairage Onyx")
  }
  return {
    deviceCode: data.device_code as string,
    userCode: data.user_code as string,
    expiresIn: Number(data.expires_in) || 300,
    interval: Number(data.interval) || 3,
  }
}

/** POST /api/auth/device/poll. Un appairage approuvé n'est lisible qu'une fois. */
export async function onyxDevicePoll(baseUrl: string, deviceCode: string): Promise<OnyxPollResult> {
  const { status, data } = await post(baseUrl, '/api/auth/device/poll', { device_code: deviceCode })
  if (status !== 200) throw failure(status, data, "Appairage Onyx indisponible")
  if (data.status === 'pending') return { kind: 'pending' }
  if (data.status === 'approved' && typeof data.token === 'string') {
    return { kind: 'ok', token: data.token, account: toAccount(data.user) }
  }
  return { kind: 'expired' }
}

/**
 * POST /api/integrations/mediahub/sso/redeem : échange le code à usage unique
 * de l'app Onyx contre le compte. Authentifié par la clé d'intégration.
 */
export async function onyxSsoRedeem(baseUrl: string, integrationKey: string, code: string): Promise<OnyxAccount> {
  const { status, data } = await post(baseUrl, '/api/integrations/mediahub/sso/redeem', { code }, integrationKey)
  if (status === 200) return toAccount(data.user)
  throw failure(status, data, 'Lien de connexion Onyx invalide')
}

/** POST /api/auth/logout : MediaHub ne garde pas de session Onyx. Meilleur effort. */
export async function onyxLogout(baseUrl: string, token: string): Promise<void> {
  try {
    await post(baseUrl, '/api/auth/logout', {}, token)
  } catch {
    // La session expirera d'elle-même côté Onyx.
  }
}
