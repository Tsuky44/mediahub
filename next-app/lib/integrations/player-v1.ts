import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { defineAbilityFor } from '@/lib/ability'
import { authenticatePlayerIntegration, type PlayerIntegrationUser } from '@/lib/integrations/player-integration-auth'
import { getMediaAvailability, toPlayerStatus, type MediaAvailability } from '@/lib/services/media-status'
import { notifyOnyx } from '@/lib/integrations/onyx-webhook'

/** Statuts numeriques de media_requests ; 6 (refusee) est propre a l'API v1. */
export const REQUEST_DECLINED = 6

export type RequestStatusName = 'pending' | 'approved' | 'processing' | 'partial' | 'available' | 'declined'

export function requestStatusName(status: number): RequestStatusName {
  switch (status) {
    case 2: return 'approved'
    case 3: return 'processing'
    case 4: return 'partial'
    case 5: return 'available'
    case REQUEST_DECLINED: return 'declined'
    default: return 'pending'
  }
}

function defaultCode(status: number) {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 400) return 'bad_request'
  if (status === 503) return 'unavailable'
  return 'error'
}

const FRENCH_ERRORS: Record<string, string> = {
  Unauthorized: 'Clé d’intégration invalide.',
  Forbidden: 'Vous n’avez pas le droit de faire cela.',
  'Forbidden: Insufficient permissions': 'Vous n’avez pas le droit de faire cela.',
  'Request not found': 'Demande introuvable.',
  'Invalid id': 'Identifiant invalide.',
  'Invalid media': 'Média invalide.',
  'Invalid body': 'Requête invalide.',
  'Missing parameters': 'Paramètres manquants.',
  'action must be approve or decline': 'L’action doit être approve ou decline.',
  'Request already processed': 'La demande est déjà traitée.',
  'Radarr not configured': 'Radarr n’est pas configuré sur MediaHub.',
  'Sonarr or TMDB not configured': 'Sonarr ou TMDB n’est pas configuré sur MediaHub.',
  'Could not find TVDB ID for this series': 'Série introuvable (identifiant TVDB manquant).',
  'Series not found in Sonarr lookup': 'Série introuvable dans Sonarr.',
}

const FRENCH_BY_STATUS: Record<number, string> = {
  400: 'Requête invalide.',
  401: 'Clé d’intégration invalide.',
  403: 'Vous n’avez pas le droit de faire cela.',
  404: 'Introuvable.',
  409: 'Conflit avec l’état actuel.',
  503: 'Service indisponible sur MediaHub.',
}

/** Erreur JSON { error, code } ; le message est toujours en français, prêt à afficher. */
export function apiError(status: number, error: string, code?: string) {
  const message = FRENCH_ERRORS[error] ?? (/[éèàêç]|(Pas|Aucun|Le |La |Les )/.test(error) ? error : FRENCH_BY_STATUS[status] ?? 'Une erreur est survenue sur MediaHub.')
  return NextResponse.json({ error: message, code: code ?? defaultCode(status) }, { status })
}

export type AuthResult =
  | { ok: true; user: PlayerIntegrationUser; ability: ReturnType<typeof defineAbilityFor>; userId: number | null }
  | { ok: false; response: NextResponse }

/** Cle d'integration + utilisateur (X-Player-Username). userId vaut null si le compte n'existe pas dans MediaHub. */
export async function authenticate(request: Request): Promise<AuthResult> {
  const user = await authenticatePlayerIntegration(request)
  if (!user) return { ok: false, response: apiError(401, 'Unauthorized') }
  const id = Number.parseInt(user.id, 10)
  return { ok: true, user, ability: defineAbilityFor(user), userId: Number.isInteger(id) && id > 0 ? id : null }
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function parseMediaType(raw: unknown): 'movie' | 'tv' | null {
  return raw === 'movie' || raw === 'tv' ? raw : null
}

export type RequestRow = typeof mediaRequests.$inferSelect

function parseMetadata(row: RequestRow): { posterPath?: string | null; seasons?: number[] } {
  try {
    return row.metadata ? JSON.parse(row.metadata) : {}
  } catch {
    return {}
  }
}

export interface WaitingInfo {
  message: string
  releaseDate: string | null
  /** Prochaine recherche prevue (sorraa) ; null quand on attend une sortie */
  nextAttemptAt?: string | null
}

/** Pourquoi rien ne se telecharge encore : le media n'est pas sorti. */
export function waitingFrom(availability: MediaAvailability | null): WaitingInfo | null {
  if (availability?.waiting) {
    return { message: availability.waiting.message, releaseDate: null, nextAttemptAt: availability.waiting.nextAttemptAt ?? null }
  }
  if (availability?.status !== 'unreleased') return null
  const date = availability.releaseDate ?? null
  return {
    message: date
      ? `Pas encore sorti, le téléchargement démarrera après sa sortie (${date.slice(0, 10)}).`
      : 'Pas encore sorti, le téléchargement démarrera après sa sortie.',
    releaseDate: date,
  }
}

export interface SerializeOptions {
  availability?: MediaAvailability | null
  withRequester?: boolean
}

export function serializeRequest(row: RequestRow, options: SerializeOptions = {}) {
  const meta = parseMetadata(row)
  const waiting = row.status >= 4 ? null : waitingFrom(options.availability ?? null)
  return {
    id: row.id,
    mediaType: row.mediaType,
    tmdbId: Number.parseInt(row.tmdbId, 10),
    title: row.title,
    posterPath: meta.posterPath ?? null,
    seasons: (meta.seasons ?? []).slice().sort((a, b) => a - b),
    status: requestStatusName(row.status),
    statusCode: row.status,
    requestedAt: row.requestedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // Pourcentage 0-100 du telechargement en cours (sorraa) ; null sinon
    progress: row.status >= 4 || options.availability?.progress === undefined ? null : Math.round(options.availability.progress * 1000) / 10,
    awaitingRelease: waiting !== null && waiting.nextAttemptAt === undefined,
    waiting,
    note: row.status === REQUEST_DECLINED ? row.notes : null,
    ...(options.withRequester ? { requester: row.requesterName ?? null } : {}),
  }
}

/** Disponibilite d'une demande, en 1,5 s au plus (sinon null). */
export async function availabilityOf(row: RequestRow): Promise<MediaAvailability | null> {
  const tmdbId = Number.parseInt(row.tmdbId, 10)
  if (!Number.isInteger(tmdbId) || (row.mediaType !== 'movie' && row.mediaType !== 'tv')) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500) })
  try {
    return await Promise.race([getMediaAvailability(tmdbId, row.mediaType), timeout])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function serializeAvailability(availability: MediaAvailability) {
  return {
    status: toPlayerStatus(availability.status),
    available: availability.available,
    awaitingRelease: availability.status === 'unreleased' && !availability.waiting,
    waiting: waitingFrom(availability),
    expectedReleaseDate: availability.releaseDate ?? null,
    seasons: (availability.seasons ?? []).map((season) => ({
      seasonNumber: season.seasonNumber,
      status: toPlayerStatus(season.status),
      available: season.available,
      totalEpisodes: season.totalEpisodes ?? null,
    })),
  }
}

/** Prevenir Onyx qu'une ou plusieurs demandes ont change d'etat. */
export async function emitRequestStatus(ids: number[], previousStatus?: number) {
  for (const id of ids) {
    const row = await db.query.mediaRequests.findFirst({ where: eq(mediaRequests.id, id) })
    if (!row) continue
    notifyOnyx('request.status_changed', {
      request: serializeRequest(row, { withRequester: true }),
      previousStatus: previousStatus !== undefined ? requestStatusName(previousStatus) : null,
      requesterId: row.userId,
    })
  }
}
