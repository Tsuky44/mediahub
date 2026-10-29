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
}

export interface SorraaRequestDraft {
  kind: SorraaKind
  tmdbId: number
  seasons?: number[]
  requester: { name: string; ref?: string }
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

  async listActiveGrabs(mediaId?: number): Promise<SorraaGrab[]> {
    const q = new URLSearchParams({ active: 'true', limit: '200' })
    if (mediaId) q.set('mediaId', String(mediaId))
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
