import { logger } from '@/lib/logger'
import { getSetting } from '../settings'

/** Contrat : sorraa/api/openapi.yaml (serveur /api/v1). */
export type SorraaKind = 'movie' | 'series'
export type SorraaRequestState = 'pending' | 'processing' | 'partial' | 'available'

export interface SorraaRequestSeason {
  number: number
  state: SorraaRequestState
  episodesHeld?: number
  episodesReleased?: number
  episodesTotal?: number
}

export interface SorraaRequestWaiting {
  reason: string
  attempts: number
  lastAttemptAt: string
  nextAttemptAt: string
}

export interface SorraaRequest {
  id: number
  mediaId: number
  kind: SorraaKind
  tmdbId: number
  requester: { name: string; ref?: string }
  createdAt: string
  state: SorraaRequestState
  seasons?: SorraaRequestSeason[]
  waiting?: SorraaRequestWaiting
  /** 0-1, absent sans telechargement en cours. */
  progress?: number
  etaSeconds?: number
}

export interface SorraaAvailability {
  inLibrary: boolean
  state: 'absent' | SorraaRequestState
  mediaId?: number
  title?: string
  monitored?: boolean
  seasons?: Array<SorraaRequestSeason & { monitored?: boolean }>
  progress?: number
  etaSeconds?: number
  waiting?: SorraaRequestWaiting
}

/** Avancement de l'import d'un telechargement : fichiers et octets deja places dans la bibliotheque. */
export interface SorraaImportProgress {
  files: number
  filesDone: number
  bytes: number
  bytesDone: number
  /** Fichier en cours de copie ; absent entre deux fichiers. */
  current?: string
}

export interface SorraaGrab {
  id: number
  mediaId: number
  mediaTitle?: string
  releaseName: string
  status: string
  progress: number
  sizeLeft: number
  speed: number
  etaSeconds?: number
  message?: string
  unitId?: number
  /** Present des que l'import a commence, gardee apres un echec. */
  importProgress?: SorraaImportProgress
}

export interface SorraaRequestDraft {
  kind: SorraaKind
  tmdbId: number
  seasons?: number[]
  requester: { name: string; ref?: string }
}

export interface SorraaUnit {
  id: number
  kind: 'movie' | 'season' | 'episode'
  seasonNumber?: number
  episodeNumber?: number
}

export interface SorraaMedia {
  id: number
  kind: SorraaKind
  title: string
  tmdbId: number
  units: SorraaUnit[]
}

/** Pourquoi sorraa ne prendrait pas une release ; les champs en plus dependent de `reason`. */
export interface SorraaRejection {
  reason: string
  quality?: string
  score?: number
  minimum?: number
  actual?: number
  limit?: number
}

/** Une release que les indexeurs offrent, jugee par le moteur de sorraa (recherche interactive). */
export interface SorraaFoundRelease {
  /** Nomme la release 30 minutes : c'est ce qu'on rend a `POST /grabs`. */
  id: string
  indexerId: number
  indexer: string
  protocol: 'usenet' | 'torrent'
  name: string
  size: number
  publishedAt?: string
  seeders?: number
  leechers?: number
  decision: { accepted: boolean; quality: string; formatScore: number; rejections: SorraaRejection[] }
}

export class SorraaError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message)
    this.name = 'SorraaError'
  }
}

export const toSorraaKind = (mediaType: 'movie' | 'tv'): SorraaKind => (mediaType === 'tv' ? 'series' : 'movie')

export class SorraaService {
  private readonly baseUrl: string

  constructor(baseUrl: string, private readonly apiKey: string) {
    const trimmed = baseUrl.replace(/\/+$/, '')
    this.baseUrl = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`
  }

  private async call<T>(method: string, path: string, opts: { body?: unknown; timeoutMs?: number } = {}): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
        cache: 'no-store',
      })
    } catch (e) {
      throw new SorraaError(`sorraa injoignable : ${(e as Error).message}`, 503, 'unreachable')
    }
    if (res.status === 204) return undefined as T
    const text = await res.text()
    let data: any = undefined
    try { data = text ? JSON.parse(text) : undefined } catch { /* corps non JSON */ }
    if (!res.ok) {
      const detail = data?.detail || data?.title || text.slice(0, 200) || `HTTP ${res.status}`
      throw new SorraaError(detail, res.status, data?.code)
    }
    return data as T
  }

  /** Verifie l'URL puis la cle : /system refuse une cle invalide (401), /health reste ouvert. */
  async testConnection(): Promise<{ version: string }> {
    try {
      const system = await this.call<{ version: string }>('GET', '/system', { timeoutMs: 8000 })
      return { version: system.version }
    } catch (e) {
      if (!(e instanceof SorraaError) || e.status !== 404) throw e
    }
    // sorraa plus ancien sans /system : health puis une route authentifiee
    const health = await this.call<{ status: string; version: string }>('GET', '/health', { timeoutMs: 8000 })
    await this.call('GET', '/requests?limit=1', { timeoutMs: 8000 })
    return { version: health.version }
  }

  async createRequest(draft: SorraaRequestDraft): Promise<{ request: SorraaRequest; existing: boolean }> {
    const url = `${this.baseUrl}/requests`
    // POST direct : le code 200 (deja demande) se distingue du 201
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(draft),
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      })
    } catch (e) {
      throw new SorraaError(`sorraa injoignable : ${(e as Error).message}`, 503, 'unreachable')
    }
    const text = await res.text()
    let data: any
    try { data = text ? JSON.parse(text) : undefined } catch { /* ignore */ }
    if (!res.ok) throw new SorraaError(data?.detail || data?.title || `HTTP ${res.status}`, res.status, data?.code)
    return { request: data as SorraaRequest, existing: res.status === 200 }
  }

  async listRequests(params: { kind: SorraaKind; tmdbId: number }): Promise<SorraaRequest[]> {
    const q = new URLSearchParams({ kind: params.kind, tmdbId: String(params.tmdbId), limit: '200' })
    const page = await this.call<{ items: SorraaRequest[] }>('GET', `/requests?${q}`)
    return page.items ?? []
  }

  /** Etat d'un titre de la bibliotheque, demande ou non (lecture seule). */
  async getAvailability(kind: SorraaKind, tmdbId: number): Promise<SorraaAvailability> {
    return this.call<SorraaAvailability>('GET', `/availability?kind=${kind}&tmdbId=${tmdbId}`)
  }

  /** Meme chose en lot (1 a 100 titres), dans l'ordre demande. */
  async queryAvailability(items: Array<{ kind: SorraaKind; tmdbId: number }>): Promise<SorraaAvailability[]> {
    const res = await this.call<{ items: SorraaAvailability[] }>('POST', '/availability-queries', { body: { items } })
    return res.items ?? []
  }

  /** Chemin absolu d'un fichier a partir du chemin relatif au dossier racine de sa version. */
  async resolveAbsolutePath(mediaId: number, relativePath: string): Promise<string> {
    if (/^([a-zA-Z]:[\\/]|\/)/.test(relativePath)) return relativePath
    const media = await this.call<{ versions?: Array<{ rootFolderId?: number }> }>('GET', `/media/${mediaId}`)
    const rootFolderId = media.versions?.find((v) => v.rootFolderId)?.rootFolderId
    const folders = (await this.call<{ items: Array<{ id: number; path: string }> }>('GET', '/root-folders')).items ?? []
    const root = folders.find((f) => f.id === rootFolderId) ?? (folders.length === 1 ? folders[0] : undefined)
    if (!root) return relativePath
    return `${root.path.replace(/[\\/]+$/, '')}/${relativePath}`
  }

  async getRequest(id: number): Promise<SorraaRequest> {
    return this.call<SorraaRequest>('GET', `/requests/${id}`)
  }

  async cancelRequest(id: number, opts: { seasons?: number[]; stopSearching?: boolean } = {}): Promise<void> {
    const q = new URLSearchParams()
    if (opts.seasons?.length) q.set('seasons', opts.seasons.join(','))
    if (opts.stopSearching) q.set('stopSearching', 'true')
    const suffix = q.toString() ? `?${q}` : ''
    await this.call('DELETE', `/requests/${id}${suffix}`)
  }

  /** Le titre de la bibliotheque de sorraa, demande ou non ; null s'il n'y est pas. */
  async findMedia(kind: SorraaKind, tmdbId: number): Promise<SorraaMedia | null> {
    const q = new URLSearchParams({ kind, tmdbId: String(tmdbId), limit: '1' })
    const page = await this.call<{ items: Array<{ id: number }> }>('GET', `/media?${q}`)
    const found = page.items?.[0]
    return found ? this.call<SorraaMedia>('GET', `/media/${found.id}`) : null
  }

  /**
   * Retire le titre de la bibliotheque avec ses demandes, ses telechargements et sa recherche.
   * Sans deleteFiles, les fichiers restent la ou ils sont : celui qui appelle les supprime.
   */
  async removeMedia(mediaId: number, opts: { deleteFiles?: boolean } = {}): Promise<void> {
    await this.call('DELETE', `/media/${mediaId}?deleteFiles=${opts.deleteFiles ? 'true' : 'false'}`)
  }

  /** La serie reste ; la saison n'est plus cherchee et quitte les demandes. */
  async removeSeason(mediaId: number, season: number, opts: { deleteFiles?: boolean } = {}): Promise<void> {
    await this.call('DELETE', `/media/${mediaId}/seasons/${season}?deleteFiles=${opts.deleteFiles ? 'true' : 'false'}`)
  }

  /** Ajoute le titre a la bibliotheque sans rien chercher : la recherche interactive choisira. */
  async addMedia(kind: SorraaKind, tmdbId: number): Promise<SorraaMedia> {
    try {
      const added = await this.call<SorraaMedia>('POST', '/media', { body: { kind, tmdbId, search: false }, timeoutMs: 30_000 })
      return added
    } catch (e) {
      // deja ajoute entre-temps : on le relit
      if (!(e instanceof SorraaError) || e.status !== 409) throw e
      const existing = await this.findMedia(kind, tmdbId)
      if (existing) return existing
      throw e
    }
  }

  /**
   * Interroge tous les indexeurs pour une unite (film, saison ou episode) et juge chaque release.
   * La recherche compte dans les limites des indexeurs et peut durer : l'echeance reste sous celle
   * d'Onyx (30 s).
   */
  async searchReleases(mediaId: number, unitId: number): Promise<SorraaFoundRelease[]> {
    const res = await this.call<{ releases: SorraaFoundRelease[] }>('POST', `/media/${mediaId}/release-searches`, {
      body: { unitId },
      timeoutMs: 27_000,
    })
    return res.releases ?? []
  }

  /** Envoie au client de telechargement la release que `searchReleases` a rendue sous ce jeton. */
  async grabRelease(releaseId: string): Promise<SorraaGrab> {
    return this.call<SorraaGrab>('POST', '/grabs', { body: { releaseId }, timeoutMs: 30_000 })
  }

  async listActiveGrabs(mediaId?: number): Promise<SorraaGrab[]> {
    const q = new URLSearchParams({ active: 'true', limit: '200' })
    if (mediaId) q.set('mediaId', String(mediaId))
    const page = await this.call<{ items: SorraaGrab[] }>('GET', `/grabs?${q}`)
    return page.items ?? []
  }

  /** Telechargements d'un titre, termines ou non : sert a suivre l'import en cours. */
  async listGrabs(mediaId: number): Promise<SorraaGrab[]> {
    const q = new URLSearchParams({ mediaId: String(mediaId), limit: '200' })
    const page = await this.call<{ items: SorraaGrab[] }>('GET', `/grabs?${q}`)
    return page.items ?? []
  }
}

let cached: { configKey: string; service: SorraaService } | null = null

export async function getSorraaService(): Promise<SorraaService | null> {
  const url = await getSetting('sorraa_url')
  const apiKey = await getSetting('sorraa_api_key')
  if (!url || !apiKey) return null
  const configKey = `${url}|${apiKey}`
  if (cached?.configKey !== configKey) {
    logger.info('[Sorraa] Client initialise')
    cached = { configKey, service: new SorraaService(url, apiKey) }
  }
  return cached.service
}
