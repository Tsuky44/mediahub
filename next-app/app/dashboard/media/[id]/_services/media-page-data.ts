import 'server-only'
import { defineAbilityFor } from '@/lib/ability'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { getMediaAvailability } from '@/lib/services/media-status'
import { isInWatchLater } from '../../watch-later-actions'
import { getSubscriptionStatus } from '../subscribe-actions'
import { normalizeCredits } from '../_utils/credits-normalize'
import { deriveMediaMeta } from '../_utils/media-derivations'
import { fetchMediaEmbyProgress } from './media-emby-progress'
import type {
  MediaDerivedMeta,
  MediaEmbyProgress,
  MediaType,
  NormalizedCredits,
} from '../_types/media-page'

export interface MediaPageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  ability: ReturnType<typeof defineAbilityFor>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availability: any
  isWatchLaterItem: boolean
  isSubscribed: boolean
  embyUrl: string | null
  credits: NormalizedCredits
  meta: MediaDerivedMeta
  progress: MediaEmbyProgress
  requestAllSeasonsEnabled: boolean
}

export type MediaPageDataResult =
  | { kind: 'access-denied' }
  | { kind: 'not-found' }
  | { kind: 'ok'; data: MediaPageData }

/**
 * Charge en parallele tout ce dont la page de details a besoin :
 * details TMDB, ability, availability, watch-later, subscription, settings,
 * credits normalises, meta derivees et progression Emby.
 */
export async function loadMediaPageData(params: {
  tmdbId: number
  mediaType: MediaType
  externalId: string
}): Promise<MediaPageDataResult> {
  const { tmdbId, mediaType, externalId } = params

  const tmdbService = await getTmdbServiceForUser()
  if (!tmdbService) return { kind: 'not-found' }

  const details = await tmdbService.getDetails(tmdbId, mediaType)
  if (!details) return { kind: 'not-found' }

  const user = await getCurrentUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ability = defineAbilityFor(user as any)

  if (
    ability.cannot('read', 'Media') &&
    ability.cannot('read', 'Library')
  ) {
    return { kind: 'access-denied' }
  }

  const credits = normalizeCredits(details, mediaType)
  const meta = deriveMediaMeta(details, credits)

  const availability = await getMediaAvailability(tmdbId, mediaType, true)
  const isWatchLaterItem = await isInWatchLater(externalId, mediaType)
  const isSubscribed = await getSubscriptionStatus(externalId, mediaType)
  const progress = await fetchMediaEmbyProgress({
    userEmail: user?.email,
    tmdbId,
    mediaType,
    details,
  })
  const embyUrl = await getSetting('emby_url') || await getSetting('jellyfin_url')
  const requestAllSeasonsEnabled = await getSetting('request_all_seasons_enabled')

  return {
    kind: 'ok',
    data: {
      details,
      user,
      ability,
      availability,
      isWatchLaterItem,
      isSubscribed,
      embyUrl: embyUrl ?? null,
      credits,
      meta,
      progress,
      requestAllSeasonsEnabled: requestAllSeasonsEnabled === 'true',
    },
  }
}
