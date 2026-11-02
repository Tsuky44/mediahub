/**
 * Compte de service Onyx : la session d'un administrateur Onyx, ouverte une fois depuis les
 * réglages de MediaHub (onglet Media) et gardée dans `onyx_service_token`.
 *
 * Elle sert à ce que la clé d'intégration n'ouvre pas : lister les comptes Onyx (import des
 * utilisateurs), lire la bibliothèque (« Ma médiathèque ») et écrire côté Onyx l'adresse et la clé
 * de MediaHub. Onyx fait glisser la session tant qu'elle sert (90 jours d'inactivité au plus).
 */
import { createMemoCache } from '@/lib/cache'
import { MS } from '@/lib/constants'
import { readSettings, setSetting } from '@/lib/settings'
import { normalizeOnyxUrl, onyxLogout } from '@/lib/services/onyx-auth'

export const ONYX_SERVICE_KEYS = ['onyx_service_token', 'onyx_service_username'] as const

export class OnyxServiceError extends Error {
  constructor(message: string, readonly status: number = 0) {
    super(message)
    this.name = 'OnyxServiceError'
  }
}

/** Droits d'un compte Onyx (models.Permissions côté Onyx) */
export interface OnyxPermissions {
  manage_settings?: boolean
  manage_library?: boolean
  manage_users?: boolean
  request_media?: boolean
  [key: string]: boolean | undefined
}

/** Compte Onyx tel que GET /api/users et GET /api/auth/me le rendent */
export interface OnyxUser {
  id: number
  username: string
  is_owner: boolean
  permissions: OnyxPermissions
  avatar?: string
}

/** Film ou série de la bibliothèque Onyx (GET /api/movies, /api/shows) */
export interface OnyxLibraryItem {
  id: number
  type: 'movie' | 'show'
  title: string
  overview?: string
  poster_url?: string
  release_date?: string
  tmdb_id?: number
}

/** Réglages Onyx publics (GET /api/settings), la partie qui concerne MediaHub */
export interface OnyxPublicSettings {
  mediahub_url: string
  mediahub_api_key_set: boolean
  mediahub_api_key_hint?: string
}

const TIMEOUT_MS = 15_000

// Catalogue entier : Onyx le rend d'un bloc, MediaHub le pagine. Relu en arrière-plan passé 1 min.
const libraryCache = createMemoCache({ max: 4, ttl: MS.MINUTE, stale: 10 * MS.MINUTE })

/** Un compte Onyx administrateur au sens de MediaHub : propriétaire ou gestion du serveur */
export function isOnyxAdmin(user: Pick<OnyxUser, 'is_owner' | 'permissions'>) {
  return user.is_owner || !!user.permissions?.manage_settings
}

export class OnyxService {
  constructor(readonly baseUrl: string, private readonly token: string, readonly username: string) {}

  private async request<T>(method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'error',
        cache: 'no-store',
      })
    } catch {
      throw new OnyxServiceError('Serveur Onyx injoignable')
    }
    const data = await res.json().catch(() => null)
    if (res.ok) return data as T
    if (res.status === 401) {
      throw new OnyxServiceError('La session du compte de service Onyx a expiré : reconnectez-le dans les réglages (onglet Media)', 401)
    }
    if (res.status === 403) {
      throw new OnyxServiceError(`Le compte Onyx « ${this.username} » n'a pas les droits nécessaires (administrateur requis)`, 403)
    }
    const message = data && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
    throw new OnyxServiceError(`Onyx refuse la requête : ${message}`, res.status)
  }

  me() {
    return this.request<OnyxUser>('GET', '/api/auth/me')
  }

  async listUsers(): Promise<OnyxUser[]> {
    const users = await this.request<OnyxUser[]>('GET', '/api/users')
    return Array.isArray(users) ? users : []
  }

  /** Films et séries d'Onyx, rangés par titre */
  listLibrary(): Promise<OnyxLibraryItem[]> {
    return libraryCache.get(`library:${this.baseUrl}`, async () => {
      const [movies, shows] = await Promise.all([
        this.request<OnyxLibraryItem[]>('GET', '/api/movies'),
        this.request<OnyxLibraryItem[]>('GET', '/api/shows'),
      ])
      return [...(Array.isArray(movies) ? movies : []), ...(Array.isArray(shows) ? shows : [])]
        .filter((item) => item && typeof item.id === 'number' && (item.type === 'movie' || item.type === 'show'))
        .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
    })
  }

  getSettings() {
    return this.request<OnyxPublicSettings>('GET', '/api/settings')
  }

  /** Écrit côté Onyx l'adresse de MediaHub et la clé d'intégration (PUT partiel) */
  linkMediaHub(mediahubUrl: string, apiKey: string) {
    return this.request<OnyxPublicSettings>('PUT', '/api/settings', { mediahub_url: mediahubUrl, mediahub_api_key: apiKey })
  }

  /** Ferme la session côté Onyx (meilleur effort) */
  logout() {
    return onyxLogout(this.baseUrl, this.token)
  }
}

/** Compte de service enregistré, ou null s'il n'y en a pas (ou pas d'adresse Onyx). */
export async function getOnyxService(): Promise<OnyxService | null> {
  const s = await readSettings(['onyx_url', ...ONYX_SERVICE_KEYS] as const)
  const url = normalizeOnyxUrl(s.onyx_url)
  if (!url || !s.onyx_service_token) return null
  return new OnyxService(url, s.onyx_service_token, s.onyx_service_username)
}

export async function saveOnyxServiceSession(token: string, username: string) {
  await setSetting('onyx_service_token', token)
  await setSetting('onyx_service_username', username)
  libraryCache.clear()
}

export async function clearOnyxServiceSession() {
  await setSetting('onyx_service_token', null)
  await setSetting('onyx_service_username', null)
  libraryCache.clear()
}
