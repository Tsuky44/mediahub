import type { defineAbilityFor } from '@/lib/ability'
import RequestButton from '../../RequestButton'
import { PlayButton } from '../PlayButton'
import { TrailerButton } from '../TrailerButton'
import MediaActionsRow from './MediaActionsRow'
import { MediaDownloadProgressBar } from './MediaDownloadProgressBar'
import type { MediaType } from '../../_types/media-page'

interface MediaPrimaryActionsProps {
  tmdbId: number
  mediaType: MediaType
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availability: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embyItem: any | null
  embyServerId: string | null
  embyUrl: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trailer: any
  ability: ReturnType<typeof defineAbilityFor>
  requestAllSeasonsEnabled: boolean
  id: string
  isWatchLaterItem: boolean
  isSubscribed: boolean
  isInCalendar: boolean
  tvdbId?: number
  canManageSettings: boolean
  canTriggerSearch: boolean
  canInteractiveSearch: boolean
}

export default function MediaPrimaryActions({
  tmdbId,
  mediaType,
  title,
  availability,
  details,
  embyItem,
  embyServerId,
  embyUrl,
  trailer,
  ability,
  requestAllSeasonsEnabled,
  id,
  isWatchLaterItem,
  isSubscribed,
  isInCalendar,
  tvdbId,
  canManageSettings,
  canTriggerSearch,
  canInteractiveSearch,
}: MediaPrimaryActionsProps) {
  return (
    <div className="flex flex-col gap-5 pt-4 border-t border-white/5 w-full">
      <div className="flex flex-wrap items-center gap-4">
        <RequestButton
          tmdbId={tmdbId}
          mediaType={mediaType}
          title={title}
          initialStatus={availability.status}
          releaseDate={availability.releaseDate}
          seasons={details.seasons}
          seasonStatuses={availability.seasons || []}
          canRequest={ability.can('create', 'MediaRequest')}
          requestAllSeasonsEnabled={requestAllSeasonsEnabled}
          tvdbId={details.external_ids?.tvdb_id}
        />
        {embyItem && embyServerId && embyUrl && (
          <PlayButton
            embyUrl={embyUrl.split('/web/')[0].replace(/\/$/, '')}
            embyItemId={embyItem.Id}
            serverId={embyServerId}
          />
        )}
        {trailer && (
          <TrailerButton youtubeId={trailer.key} title={title} />
        )}

        <MediaActionsRow
          id={id}
          tmdbId={tmdbId}
          mediaType={mediaType}
          title={title}
          releaseDate={details.release_date || details.first_air_date}
          details={details}
          embyItem={embyItem}
          isWatchLaterItem={isWatchLaterItem}
          isSubscribed={isSubscribed}
          isInCalendar={isInCalendar}
          tvdbId={tvdbId}
          canManageSettings={canManageSettings}
          canTriggerSearch={canTriggerSearch}
          canInteractiveSearch={canInteractiveSearch}
        />
      </div>

      <MediaDownloadProgressBar
        tmdbId={tmdbId}
        mediaType={mediaType}
        tvdbId={tvdbId}
        title={title}
      />
    </div>
  )
}
