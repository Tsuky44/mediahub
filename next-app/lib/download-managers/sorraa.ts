import { getSorraaService, SorraaError, toSorraaKind, type SorraaRequest, type SorraaRequestState } from '@/lib/services/sorraa'
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
    const requests = await sorraa.listRequests({ kind: toSorraaKind(mediaType), tmdbId })
    if (requests.length === 0) return { status: 'unknown', available: false }

    const merged = mergeRequests(requests)
    const waitingRequest = requests.find((r) => r.waiting)
    const waiting = waitingRequest?.waiting
      ? { message: waitingRequest.waiting.reason, nextAttemptAt: waitingRequest.waiting.nextAttemptAt }
      : undefined

    if (mediaType === 'movie') {
      const status = toMediaStatus(merged.state)
      return { status, available: status === 'available', details: requests, waiting }
    }

    const seasons = [...merged.seasons.entries()]
      .sort(([a], [b]) => a - b)
      .map(([seasonNumber, state]) => ({
        seasonNumber,
        status: toMediaStatus(state),
        available: state === 'available' || state === 'partial',
      }))
    const regular = seasons.filter((s) => s.seasonNumber > 0)
    const scope = regular.length > 0 ? regular : seasons
    let status: MediaStatus
    if (scope.length === 0) status = toMediaStatus(merged.state)
    else if (scope.every((s) => s.status === 'available')) status = 'available'
    else if (scope.some((s) => s.available)) status = 'partial'
    else if (scope.some((s) => s.status === 'processing')) status = 'processing'
    else status = 'pending'

    return { status, available: status === 'available' || status === 'partial', seasons, details: requests, waiting }
  }
}
