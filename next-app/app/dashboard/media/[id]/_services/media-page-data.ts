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

  const [tmdbService, user] = await Promise.all([getTmdbServiceForUser(), getCurrentUser()])
  if (!tmdbService) return { kind: 'not-found' }

  // Tout ce qui ne dépend pas des détails TMDB part en même temps qu'eux (disponibilité
  // Radarr/Sonarr, listes, réglages) : la fiche attend le plus lent, pas leur somme.
  // Promesses sans attente si la fiche n'existe pas : leurs erreurs sont absorbées ici.
  const quiet = <T,>(p: Promise<T>) => (p.catch(() => {}), p)
  const early = {
    availability: quiet(getMediaAvailability(tmdbId, mediaType, true)),
    isWatchLaterItem: quiet(isInWatchLater(externalId, mediaType)),
    isSubscribed: quiet(getSubscriptionStatus(externalId, mediaType)),
    embyUrl: quiet(getSetting('emby_url')),
    jellyfinUrl: quiet(getSetting('jellyfin_url')),
    requestAllSeasons: quiet(getSetting('request_all_seasons_enabled')),
  }

  const details = await tmdbService.getDetails(tmdbId, mediaType)
  if (!details) return { kind: 'not-found' }

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

  const [
    availability,
    isWatchLaterItem,
    isSubscribed,
    progress,
    embyUrlSetting,
    jellyfinUrlSetting,
    requestAllSeasonsEnabled,
  ] = await Promise.all([
    early.availability,
    early.isWatchLaterItem,
    early.isSubscribed,
    fetchMediaEmbyProgress({
      userEmail: user?.email,
      tmdbId,
      mediaType,
      details,
    }),
    early.embyUrl,
    early.jellyfinUrl,
    early.requestAllSeasons,
  ])
  const embyUrl = embyUrlSetting || jellyfinUrlSetting

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
