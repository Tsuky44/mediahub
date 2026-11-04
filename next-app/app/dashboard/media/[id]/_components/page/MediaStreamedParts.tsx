import { SkeletonBlock } from '@/components/ui/skeletons'
import { SeasonList } from '../SeasonList'
import { UserActivityButton } from '../UserActivityButton'
import MediaAvailabilityBadges from './MediaAvailabilityBadges'
import MediaPrimaryActions from './MediaPrimaryActions'
import { WatchedBadge } from './MediaTitleHeader'
import type { MediaPageExtras } from '../../_services/media-page-data'
import type { MediaType } from '../../_types/media-page'
import type { ComponentProps, ReactNode } from 'react'

/*
 * Blocs de la fiche qui dépendent de Radarr/Sonarr, des listes ou d'Emby (plus lents que TMDB) :
 * chacun attend `extras` dans son propre Suspense, la fiche s'affiche sans eux puis les reçoit.
 */

type Extras = { extras: Promise<MediaPageExtras> }

export async function StreamedStatusBadge({ extras }: Extras) {
  const { availability } = await extras
  return <MediaAvailabilityBadges status={availability.status} />
}

export async function StreamedWatchedBadge({ extras, mediaType }: Extras & { mediaType: MediaType }) {
  const { progress } = await extras
  return mediaType === 'movie' && progress.userProgress?.played ? <WatchedBadge /> : null
}

type ActionsProps = Omit<
  ComponentProps<typeof MediaPrimaryActions>,
  'availability' | 'embyItem' | 'embyServerId' | 'embyUrl' | 'requestAllSeasonsEnabled' | 'isWatchLaterItem' | 'isSubscribed' | 'isInCalendar'
>

export async function StreamedActions({ extras, ...props }: Extras & ActionsProps) {
  const { availability, progress, embyUrl, requestAllSeasonsEnabled, isWatchLaterItem, isSubscribed } = await extras
  return (
    <MediaPrimaryActions
      {...props}
      availability={availability}
      embyItem={progress.embyItem}
      embyServerId={progress.embyServerId}
      embyUrl={embyUrl}
      requestAllSeasonsEnabled={requestAllSeasonsEnabled}
      isWatchLaterItem={isWatchLaterItem}
      isSubscribed={isSubscribed}
      isInCalendar={progress.isInCalendar}
    />
  )
}

/** Place des boutons pendant leur chargement : même hauteur, pas de saut à leur arrivée */
export function ActionsSkeleton() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-3 border-t border-white/5 pt-4 sm:gap-5">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <SkeletonBlock className="h-[50px] w-52 rounded-full" />
        <SkeletonBlock className="h-[50px] w-40 rounded-full" />
        <SkeletonBlock className="size-12 rounded-full" />
      </div>
    </div>
  )
}

interface SeasonsProps extends Extras {
  tmdbId: number
  tvdbId?: number
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seasons: any[]
  canTriggerSearch: boolean
  canInteractiveSearch: boolean
  canRequest: boolean
}

function SeasonsHeader({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-2xl font-bold text-white">Saisons</h2>
      {children}
    </div>
  )
}

export async function StreamedSeasons({ extras, tmdbId, tvdbId, title, seasons, canTriggerSearch, canInteractiveSearch, canRequest }: SeasonsProps) {
  const { availability, progress } = await extras
  const { embyItem, userProgress, seasonProgress } = progress
  return (
    <section>
      <SeasonsHeader>
        <div className="flex flex-wrap items-center gap-4">
          {embyItem && <UserActivityButton tmdbId={tmdbId} mediaType="tv" title={title} />}
          {userProgress && userProgress.totalEpisodes !== undefined && userProgress.totalEpisodes > 0 && (
            <div className="flex w-full items-center gap-3 sm:w-64">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full border border-white/5 bg-gray-800/60">
                <div
                  className="onyx-grow absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${userProgress.playedPercentage}%`,
                    background: 'linear-gradient(90deg, #9a9794, #f2f0ed)',
                    boxShadow: '0 0 8px rgba(232,230,228,0.24)',
                  }}
                />
              </div>
              <span className="whitespace-nowrap text-xs font-bold text-white">
                {Math.round(userProgress.playedPercentage)}%
                <span className="ml-1 font-normal text-gray-500">
                  ({userProgress.totalEpisodes - userProgress.unplayedItemCount}/{userProgress.totalEpisodes})
                </span>
              </span>
            </div>
          )}
        </div>
      </SeasonsHeader>
      <SeasonList
        tvId={tmdbId}
        tvdbId={tvdbId}
        title={title}
        seasons={seasons}
        seasonStatuses={availability.seasons || []}
        seasonProgress={seasonProgress}
        canTriggerSearch={canTriggerSearch}
        canInteractiveSearch={canInteractiveSearch}
        canRequest={canRequest}
      />
    </section>
  )
}

/** Saisons en attente de leurs statuts : le titre et une bulle par saison, à leur place */
export function SeasonsSkeleton({ count }: { count: number }) {
  return (
    <section aria-hidden>
      <SeasonsHeader />
      <div className="flex gap-3 overflow-hidden py-3">
        {Array.from({ length: Math.min(count, 12) }, (_, i) => (
          <SkeletonBlock key={i} className="size-12 shrink-0 rounded-full" />
        ))}
      </div>
    </section>
  )
}
