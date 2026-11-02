/**
 * Ce que MediaHub lit et écrit chez Onyx avec la seule clé d'intégration (ADR-0102 d'Onyx,
 * routes /api/integrations/mediahub/*) : les comptes à importer, la bibliothèque de
 * « Ma médiathèque » et l'adresse de MediaHub. Remplace l'ancien compte de service (session
 * d'un administrateur Onyx), qui expirait et ouvrait tout le serveur.
 *
 * Formats épinglés dans contract/mediahub/onyx_integration_*.json (dépôt d'Onyx).
 */
import { createMemoCache } from '@/lib/cache'
import { MS } from '@/lib/constants'
import { getOnyxIntegrationConfig } from '@/lib/integrations/onyx-config'

export class OnyxDirectoryError extends Error {
  constructor(message: string, readonly status: number = 0) {
    super(message)
    this.name = 'OnyxDirectoryError'
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

/** Compte Onyx tel que GET /api/integrations/mediahub/users le rend */
export interface OnyxUser {
  id: number
  username: string
  is_owner: boolean
  permissions: OnyxPermissions
  avatar?: string
}

/** Film ou série de la bibliothèque Onyx (GET /api/integrations/mediahub/movies, /shows) */
export interface OnyxLibraryItem {
  id: number
  type: 'movie' | 'show'
  title: string
  overview?: string
  poster_url?: string
  release_date?: string
  tmdb_id?: number
}

/** État de la liaison vu d'Onyx (GET|PUT /api/integrations/mediahub/link) */
export interface OnyxLinkState {
  mediahub_url: string
  mediahub_api_key_hint: string
  server_version: string
}

const BASE = '/api/integrations/mediahub'
const TIMEOUT_MS = 15_000

// Catalogue entier : Onyx le rend d'un bloc, MediaHub le pagine. Relu en arrière-plan passé 1 min.
const libraryCache = createMemoCache({ max: 4, ttl: MS.MINUTE, stale: 10 * MS.MINUTE })

/** Un compte Onyx administrateur au sens de MediaHub : propriétaire ou gestion du serveur */
export function isOnyxAdmin(user: Pick<OnyxUser, 'is_owner' | 'permissions'>) {
  return user.is_owner || !!user.permissions?.manage_settings
}

export class OnyxDirectory {
  constructor(readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.apiKey}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'error',
        cache: 'no-store',
      })
    } catch {
      throw new OnyxDirectoryError('Serveur Onyx injoignable')
    }
    const data = await res.json().catch(() => null)
    if (res.ok) return data as T
    if (res.status === 401) {
      throw new OnyxDirectoryError("Onyx refuse la clé d'intégration : enregistrez la même clé dans les réglages d'Onyx (MediaHub)", 401)
    }
    if (res.status === 404 || res.status === 405) {
      throw new OnyxDirectoryError("Onyx est trop ancien pour la liaison par clé : mettez-le à jour", 404)
    }
    const message = data && typeof data.error === 'string' ? data.error : `HTTP ${res.status}`
    throw new OnyxDirectoryError(`Onyx refuse la requête : ${message}`, res.status)
  }

  link() {
    return this.request<OnyxLinkState>('GET', '/link')
  }

  /** Écrit côté Onyx l'adresse de MediaHub et, pour une rotation, la nouvelle clé */
  updateLink(update: { mediahubUrl?: string; newApiKey?: string }) {
    return this.request<OnyxLinkState>('PUT', '/link', {
      ...(update.mediahubUrl !== undefined ? { mediahub_url: update.mediahubUrl } : {}),
      ...(update.newApiKey !== undefined ? { mediahub_api_key: update.newApiKey } : {}),
    })
  }

  async listUsers(): Promise<OnyxUser[]> {
    const data = await this.request<{ users?: OnyxUser[] }>('GET', '/users')
    return Array.isArray(data?.users) ? data.users : []
  }

  /** Films et séries d'Onyx, rangés par titre */
  listLibrary(): Promise<OnyxLibraryItem[]> {
    return libraryCache.get(`library:${this.baseUrl}`, async () => {
      const [movies, shows] = await Promise.all([
        this.request<OnyxLibraryItem[]>('GET', '/movies'),
        this.request<OnyxLibraryItem[]>('GET', '/shows'),
      ])
      return [...(Array.isArray(movies) ? movies : []), ...(Array.isArray(shows) ? shows : [])]
        .filter((item) => item && typeof item.id === 'number' && (item.type === 'movie' || item.type === 'show'))
        .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
    })
  }
}

/** Client d'Onyx, ou null sans adresse Onyx ou sans clé d'intégration. */
export async function getOnyxDirectory(): Promise<OnyxDirectory | null> {
  const config = await getOnyxIntegrationConfig()
  if (!config.url || !config.apiKey) return null
  return new OnyxDirectory(config.url, config.apiKey)
}

/** À appeler quand l'adresse ou la clé change : le catalogue en cache venait peut-être d'un autre Onyx. */
export function clearOnyxLibraryCache() {
  libraryCache.clear()
}
