import type { defineAbilityFor } from '@/lib/ability'
import RequestButton from '../../RequestButton'
import { PlayButton } from '../PlayButton'
import { TrailerButton } from '../TrailerButton'
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
}: MediaPrimaryActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
      <RequestButton
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
        initialStatus={availability.status}
        seasons={details.seasons}
        seasonStatuses={availability.seasons || []}
        canRequest={ability.can('create', 'MediaRequest')}
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
    </div>
  )
}
