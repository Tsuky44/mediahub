import { getSorraaService, SorraaError, toSorraaKind, type SorraaAvailability, type SorraaRequest, type SorraaRequestState } from '@/lib/services/sorraa'
import { cache } from '@/lib/cache'
import type { DownloadStatus } from '@/app/dashboard/media/[id]/download-status-actions'
import type { MediaAvailability, MediaStatus } from '@/lib/services/media-status'
import type { AddRequestInput, AddRequestOutcome, DownloadManager } from './types'

const RANK: Record<SorraaRequestState, number> = { pending: 0, processing: 1, partial: 2, available: 3 }

/** Statut local (media_requests.status) : 2 approuvee, 3 en cours, 4 partielle, 5 disponible. */
export function stateToRequestStatus(state: SorraaRequestState): number {
  switch (state) {
    case 'available': return 5
    case 'partial': return 4
    case 'processing': return 3
    default: return 2
  }
}

const best = (a: SorraaRequestState, b: SorraaRequestState) => (RANK[b] > RANK[a] ? b : a)

/** Fusionne les demandes d'un meme titre (une par demandeur) : le meilleur etat gagne. */
export function mergeRequests(requests: Pick<SorraaRequest, 'state' | 'seasons'>[]): {
  state: SorraaRequestState
  seasons: Map<number, SorraaRequestState>
} {
  let state: SorraaRequestState = 'pending'
  const seasons = new Map<number, SorraaRequestState>()
  requests.forEach((r, i) => {
    state = i === 0 ? r.state : best(state, r.state)
    for (const s of r.seasons ?? []) seasons.set(s.number, seasons.has(s.number) ? best(seasons.get(s.number)!, s.state) : s.state)
  })
  return { state, seasons }
}

function toMediaStatus(state: SorraaRequestState): MediaStatus {
  return state === 'available' ? 'available' : state
}

export class SorraaDownloadManager implements DownloadManager {
  readonly kind = 'sorraa' as const

  async addRequest({ tmdbId, mediaType, seasons, requester }: AddRequestInput): Promise<AddRequestOutcome> {
    const sorraa = await getSorraaService()
    if (!sorraa) return { ok: false, status: 503, error: 'sorraa not configured' }
    try {
      const { request, existing } = await sorraa.createRequest({
        kind: toSorraaKind(mediaType),
        tmdbId,
        ...(mediaType === 'tv' && seasons && seasons.length > 0 ? { seasons } : {}),
        requester: { name: requester.name || 'MediaHub', ref: requester.id },
      })
      return {
        ok: true,
        message: existing ? 'Already requested' : undefined,
        data: request,
        externalId: `sorraa:${request.id}`,
        allSeasons: request.seasons?.map((s) => s.number),
      }
    } catch (e) {
      if (e instanceof SorraaError) {
        const status = e.status === 404 ? 404 : e.status === 400 ? 400 : 503
        return { ok: false, status, error: `sorraa : ${e.message}` }
      }
      throw e
    }
  }

  async getAvailability(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<MediaAvailability> {
    const sorraa = await getSorraaService()
    if (!sorraa) return { status: 'unknown', available: false }
    const kind = toSorraaKind(mediaType)
    try {
      return availabilityFromSorraa(await sorraa.getAvailability(kind, tmdbId), mediaType)
    } catch (e) {
      // sorraa plus ancien, sans /availability : on lit les demandes
      if (!(e instanceof SorraaError) || e.status !== 404) throw e
    }
    const requests = await sorraa.listRequests({ kind, tmdbId })
    if (requests.length === 0) return { status: 'unknown', available: false }
    const merged = mergeRequests(requests)
    const waitingRequest = requests.find((r) => r.waiting)
    return availabilityFromSorraa(
      {
        inLibrary: true,
        state: merged.state,
        seasons: [...merged.seasons.entries()].map(([number, state]) => ({ number, state })),
        progress: maxOf(requests.map((r) => r.progress)),
        etaSeconds: maxOf(requests.map((r) => r.etaSeconds)),
        waiting: waitingRequest?.waiting,
      },
      mediaType
    )
  }

  /** Remplit le cache de statuts d'un lot de titres avec un seul appel a sorraa. */
  async prefetchAvailability(items: Array<{ tmdbId: number; mediaType: 'movie' | 'tv' }>): Promise<void> {
    const sorraa = await getSorraaService()
    if (!sorraa || items.length === 0) return
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100)
      try {
        const results = await sorraa.queryAvailability(chunk.map((it) => ({ kind: toSorraaKind(it.mediaType), tmdbId: it.tmdbId })))
        chunk.forEach((it, idx) => {
          if (results[idx]) cache.set(`media_availability_${it.mediaType}_${it.tmdbId}`, availabilityFromSorraa(results[idx], it.mediaType), 60 * 1000)
        })
      } catch (e) {
        if (!(e instanceof SorraaError)) throw e // ancien sorraa : lecture titre par titre
      }
    }
  }

  /** Etat du telechargement pour la barre de progression et la fenetre de statut. */
  async getDownloadStatus(tmdbId: number, mediaType: 'movie' | 'tv', title?: string): Promise<DownloadStatus | null> {
    const sorraa = await getSorraaService()
    if (!sorraa) return null
    const availability = await sorraa.getAvailability(toSorraaKind(mediaType), tmdbId).catch(() => null)
    if (!availability?.inLibrary || availability.progress === undefined) return null

    const grabs = availability.mediaId ? await sorraa.listActiveGrabs(availability.mediaId).catch(() => []) : []
    const first = grabs[0]
    const sizeLeft = grabs.reduce((sum, g) => sum + (g.sizeLeft || 0), 0)
    const speed = grabs.reduce((sum, g) => sum + (g.speed || 0), 0)
    return {
      isDownloading: true,
      progress: Math.round(availability.progress * 1000) / 10,
      timeleft: availability.etaSeconds !== undefined ? formatDuration(availability.etaSeconds) : '',
      status: 'downloading',
      title: title || availability.title || '',
      releaseTitle: first?.releaseName,
      size: '',
      sizeLeft: sizeLeft ? formatBytes(sizeLeft) : '',
      speed: speed ? `${formatBytes(speed)}/s` : undefined,
    }
  }
}

function maxOf(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((v): v is number => typeof v === 'number')
  return defined.length ? Math.max(...defined) : undefined
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  return parts.length ? parts.join(' ') : `${seconds}s`
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`
}

type SeasonLike = { number: number; state: SorraaRequestState; episodesReleased?: number; episodesTotal?: number; monitored?: boolean }

/** /availability de sorraa vers le statut commun de MediaHub. */
export function availabilityFromSorraa(entry: SorraaAvailability, mediaType: 'movie' | 'tv'): MediaAvailability {
  if (!entry.inLibrary || entry.state === 'absent') return { status: 'unknown', available: false }

  const waiting = entry.waiting
    ? { message: entry.waiting.reason, nextAttemptAt: entry.waiting.nextAttemptAt }
    : undefined
  const extra = { details: entry, waiting, progress: entry.progress, etaSeconds: entry.etaSeconds }
  const seasonStatus = (s: SeasonLike): MediaStatus =>
    s.state === 'pending' && s.episodesReleased === 0 && (s.episodesTotal ?? 0) > 0 ? 'unreleased' : toMediaStatus(s.state)

  if (mediaType === 'movie') {
    // Un film est la saison 0 d'un episode
    const movie = entry.seasons?.[0]
    const status = movie ? seasonStatus(movie) : toMediaStatus(entry.state as SorraaRequestState)
    return { status, available: status === 'available', ...extra }
  }

  const seasons = (entry.seasons ?? [])
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((s: SeasonLike) => ({
      seasonNumber: s.number,
      status: seasonStatus(s),
      available: s.state === 'available' || s.state === 'partial',
      totalEpisodes: s.episodesTotal,
    }))
  const regular = seasons.filter((s) => s.seasonNumber > 0)
  const scope = regular.length > 0 ? regular : seasons
  let status: MediaStatus
  if (scope.length === 0) status = toMediaStatus(entry.state as SorraaRequestState)
  else if (scope.every((s) => s.status === 'available')) status = 'available'
  else if (scope.some((s) => s.available)) status = 'partial'
  else if (scope.some((s) => s.status === 'processing')) status = 'processing'
  else if (scope.every((s) => s.status === 'unreleased' || s.status === 'unknown')) status = 'unreleased'
  else status = 'pending'

  return { status, available: status === 'available' || status === 'partial', seasons, ...extra }
}
