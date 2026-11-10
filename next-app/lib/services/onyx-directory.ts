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

/**
 * Film ou série de la bibliothèque Onyx (GET /api/integrations/mediahub/movies, /shows). La
 * progression est celle du compte nommé par X-Player-Id : absente (zéro) sans compte lié.
 */
export interface OnyxLibraryItem {
  id: number
  type: 'movie' | 'show'
  title: string
  overview?: string
  poster_url?: string
  release_date?: string
  tmdb_id?: number
  /** Film : position de lecture et durée en secondes, fini ou non */
  current_position_seconds?: number
  duration?: number
  is_finished?: boolean
  /** Série : épisodes sur le disque, finis, commencés */
  available_episode_count?: number
  watched_episode_count?: number
  started_episode_count?: number
}

/** Totaux de la bibliothèque Onyx (GET /api/integrations/mediahub/counts) */
export interface OnyxLibraryCounts {
  movies: number
  shows: number
  episodes: number
}

/** Ligne du gestionnaire de stockage (GET /api/integrations/mediahub/storage, ADR-0114 d'Onyx) */
export interface OnyxStorageItem {
  id: number
  type: 'movie' | 'show'
  title: string
  tmdb_id?: number
  path: string
  /** Octets ; série : somme de ses épisodes avec fichier */
  size: number
  episode_count?: number
  added_at?: string
  /** Dernière lecture tous comptes confondus (RFC 3339) */
  last_played_at?: string
}

export interface OnyxStorageList {
  movies: OnyxStorageItem[]
  shows: OnyxStorageItem[]
}

export interface OnyxStorageSeason {
  id: number
  number: number
  title: string
  size: number
  episode_count: number
  path: string
}

export interface OnyxStorageViewer {
  user_id: number
  username: string
  finished: boolean
  last_played_at?: string
  position_seconds: number
  duration_seconds: number
  watched_episodes?: number
  total_episodes?: number
  seasons?: Array<{ number: number; total: number; watched: number }>
}

/** Détail d'un film ou d'une série (GET /api/integrations/mediahub/storage/:id) */
export interface OnyxStorageDetails {
  id: number
  type: 'movie' | 'show'
  title: string
  overview?: string
  release_date?: string
  duration?: number
  path?: string
  seasons: OnyxStorageSeason[]
  viewers: OnyxStorageViewer[]
}

/** Ce que DELETE /api/integrations/mediahub/storage/:id a retiré du disque */
export interface OnyxDeleteReport {
  files_removed: number
  bytes_freed: number
}

/** État de la liaison vu d'Onyx (GET|PUT /api/integrations/mediahub/link) */
export interface OnyxLinkState {
  mediahub_url: string
  mediahub_api_key_hint: string
  server_version: string
}

const BASE = '/api/integrations/mediahub'
const TIMEOUT_MS = 15_000
// Supprimer un dossier sur un partage réseau peut être long
const DELETE_TIMEOUT_MS = 120_000

// Catalogue entier : Onyx le rend d'un bloc, MediaHub le pagine. Relu en arrière-plan passé 1 min.
// Une entrée par compte Onyx : la progression diffère d'un compte à l'autre.
const libraryCache = createMemoCache({ max: 64, ttl: MS.MINUTE, stale: 10 * MS.MINUTE })

/** Un compte Onyx administrateur au sens de MediaHub : propriétaire ou gestion du serveur */
export function isOnyxAdmin(user: Pick<OnyxUser, 'is_owner' | 'permissions'>) {
  return user.is_owner || !!user.permissions?.manage_settings
}

export class OnyxDirectory {
  constructor(readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown, playerId?: string): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(playerId ? { 'X-Player-Id': playerId } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(method === 'DELETE' ? DELETE_TIMEOUT_MS : TIMEOUT_MS),
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
    // Route inconnue d'Onyx : texte brut. Un média introuvable : 404 avec un message JSON.
    const message = data && typeof data.error === 'string' ? data.error : null
    if ((res.status === 404 && !message) || res.status === 405) {
      throw new OnyxDirectoryError("Onyx est trop ancien pour la liaison par clé : mettez-le à jour", 404)
    }
    throw new OnyxDirectoryError(`Onyx refuse la requête : ${message ?? `HTTP ${res.status}`}`, res.status)
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

  /** Totaux de la bibliothèque (accueil) */
  counts() {
    return this.request<OnyxLibraryCounts>('GET', '/counts')
  }

  /** Films et séries avec leur taille et leur dernière lecture (gestionnaire de stockage) */
  storage() {
    return this.request<OnyxStorageList>('GET', '/storage')
  }

  storageDetails(id: string | number) {
    return this.request<OnyxStorageDetails>('GET', `/storage/${encodeURIComponent(String(id))}`)
  }

  /** Supprime du disque et d'Onyx le film, la série ou la saison */
  deleteStorage(id: string | number) {
    return this.request<OnyxDeleteReport>('DELETE', `/storage/${encodeURIComponent(String(id))}`)
  }

  /** Films et séries d'Onyx rangés par titre, avec la progression du compte Onyx `playerId` */
  listLibrary(playerId?: string | null): Promise<OnyxLibraryItem[]> {
    const account = playerId || undefined
    return libraryCache.get(`library:${this.baseUrl}:${account ?? '-'}`, async () => {
      const [movies, shows] = await Promise.all([
        this.request<OnyxLibraryItem[]>('GET', '/movies', undefined, account),
        this.request<OnyxLibraryItem[]>('GET', '/shows', undefined, account),
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
