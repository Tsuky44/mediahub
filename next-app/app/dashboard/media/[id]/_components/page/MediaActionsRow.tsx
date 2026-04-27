import type { defineAbilityFor } from '@/lib/ability'
import WatchLaterButton from '../../WatchLaterButton'
import { SubscribeButton } from '../../SubscribeButton'
import FavoriteButton from '../../FavoriteButton'
import { ManageMediaButton } from '../../ManageMediaButton'
import { UserActivityButton } from '../UserActivityButton'
import { CalendarButton } from '@/components/global/CalendarButton'
import { SearchActions } from '../SearchActions'
import type { MediaType } from '../../_types/media-page'

interface MediaActionsRowProps {
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  releaseDate?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embyItem: any | null
  isWatchLaterItem: boolean
  isSubscribed: boolean
  isInCalendar: boolean
  tvdbId?: number
  ability: ReturnType<typeof defineAbilityFor>
}

export default function MediaActionsRow({
  id,
  tmdbId,
  mediaType,
  title,
  releaseDate,
  details,
  embyItem,
  isWatchLaterItem,
  isSubscribed,
  isInCalendar,
  tvdbId,
  ability,
}: MediaActionsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      <WatchLaterButton
        mediaId={embyItem ? embyItem.Id : id}
        tmdbId={id}
        mediaType={mediaType}
        title={title}
        posterPath={details.poster_path}
        isEmbyItem={!!embyItem}
        initialIsWatchLater={isWatchLaterItem}
      />
      <SubscribeButton
        tmdbId={id}
        mediaType={mediaType}
        title={title}
        initialIsSubscribed={isSubscribed}
      />
      {embyItem && (
        <FavoriteButton
          embyItemId={embyItem.Id}
          initialIsFavorite={embyItem.UserData?.IsFavorite || false}
          tmdbId={id}
          mediaType={mediaType}
        />
      )}
      <UserActivityButton
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
      />
      <CalendarButton
        tmdbId={tmdbId.toString()}
        mediaType={mediaType}
        title={title}
        releaseDate={releaseDate}
        initialIsInCalendar={isInCalendar}
      />
      {ability.can('manage_settings', 'Media') && (
        <ManageMediaButton
          tmdbId={tmdbId}
          mediaType={mediaType}
          title={title}
        />
      )}
      {mediaType === 'movie' &&
        (ability.can('trigger_search', 'Media') ||
          ability.can('interactive_search', 'Media')) && (
          <SearchActions
            title={title}
            canTriggerSearch={ability.can('trigger_search', 'Media')}
            canInteractiveSearch={ability.can('interactive_search', 'Media')}
            mediaType={mediaType}
            tmdbId={tmdbId}
            tvdbId={tvdbId}
            seasons={details.seasons}
          />
        )}
    </div>
  )
}
