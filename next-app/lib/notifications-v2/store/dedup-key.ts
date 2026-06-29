/**
 * Dedup Key Builder — génère les clés anti-doublon uniques par event.
 * C'est cette clé qui est stockée dans `notification_events.dedup_key`
 * avec une contrainte UNIQUE pour garantir 0 doublon au niveau DB.
 *
 * Stratégie de déduplication :
 * - Events liés à une demande (REQUESTED, APPROVED) : dédup permanente par userId+tmdbId+event
 * - Events de cycle de vie (GRABBED, AVAILABLE, etc.) : dédup par jour (YYYY-MM-DD)
 *   → Permet de re-notifier si le film est re-téléchargé un autre jour
 */

import type { NotificationEvent, MediaInfo, RequesterInfo } from '../types'

// Events qui doivent être dédupliqués de façon permanente (une seule fois par demande)
// MEDIA_AVAILABLE / SEASON_PARTIALLY_AVAILABLE : permanents pour éviter un re-spam
// quotidien à minuit (le changement de date créerait une nouvelle clé et le poller
// re-dispatcherait toutes les requests status=5 chaque jour).
// Pour re-notifier après suppression+re-DL → utiliser la route admin purge-notif-dedup.
const PERMANENT_DEDUP_EVENTS = new Set<NotificationEvent>([
  'MEDIA_REQUESTED',
  'MEDIA_APPROVED',
  'MEDIA_AVAILABLE',
  'SEASON_PARTIALLY_AVAILABLE',
  'EPISODE_AVAILABLE',
])

// Retourne la date du jour au format YYYY-MM-DD (pour dédup journalière)
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Encode l'identifiant saison(s) et épisode(s) pour la clé : "S1" pour une seule, "S1:E3" avec épisode. */
function seasonSegment(media: MediaInfo): string {
  let seg = ''
  if (media.seasonNumber !== undefined) {
    seg += `:S${media.seasonNumber}`
  } else if (media.mediaType === 'tv' && media.seasons && media.seasons.length > 0) {
    const sorted = [...media.seasons].sort((a, b) => a - b)
    seg += `:S${sorted.join(',')}`
  }

  const epNum = (media as any).episodeNumber
  if (epNum !== undefined) {
    seg += `:E${epNum}`
  }
  return seg
}

export function buildDedupKey(
  event: NotificationEvent,
  media: MediaInfo,
  requester?: RequesterInfo,
  stage?: string
): string {
  const isPermanent = PERMANENT_DEDUP_EVENTS.has(event)
  // Pour les events non-permanents, on inclut la date du jour pour permettre
  // des re-notifications (ex: re-téléchargement, upgrade de qualité)
  const dateSuffix = isPermanent ? '' : `:${today()}`
  const seasonPart = seasonSegment(media)

  // Pattern req:<userId>:<mediaType>:<tmdbId>:<event>[:<season>][:<date>]
  if (requester?.id) {
    let key = `req:${requester.id}:${media.mediaType}:${media.tmdbId}:${event}${seasonPart}`
    key += dateSuffix
    return key
  }

  // Fallback sur tmdb (pour subscriptions sans request)
  let base = `tmdb:${media.mediaType}:${media.tmdbId}:${event}${seasonPart}`

  if (event === 'MEDIA_FAILED' && stage) {
    return `${base}:${stage}${dateSuffix}`
  }

  return `${base}${dateSuffix}`
}

/**
 * Parse un dedupKey pour en extraire les composants (debugging/audit).
 */
export function parseDedupKey(dedupKey: string): {
  type: 'request' | 'tmdb' | 'unknown'
  requestId?: number
  tmdbId?: string
  mediaType?: string
  event?: string
  seasonNumber?: number
  stage?: string
} {
  if (dedupKey.startsWith('req:')) {
    // Format: req:<userId>:<mediaType>:<tmdbId>:<event>[:<season>]
    const parts = dedupKey.split(':')
    const hasSeason = parts[5]?.startsWith('S')
    return {
      type: 'request',
      requestId: parseInt(parts[1], 10),
      mediaType: parts[2],
      tmdbId: parts[3],
      event: parts[4],
      seasonNumber: hasSeason ? parseInt(parts[5].slice(1), 10) : undefined,
    }
  }

  if (dedupKey.startsWith('tmdb:')) {
    const parts = dedupKey.split(':')
    const hasSeason = parts[4]?.startsWith('S')
    return {
      type: 'tmdb',
      mediaType: parts[1],
      tmdbId: parts[2],
      event: hasSeason ? parts[3] : parts[3],
      seasonNumber: hasSeason ? parseInt(parts[4].slice(1), 10) : undefined,
      stage: hasSeason ? parts[5] : parts[4],
    }
  }

  return { type: 'unknown' }
}
