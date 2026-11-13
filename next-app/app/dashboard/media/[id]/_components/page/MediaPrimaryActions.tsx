import type { defineAbilityFor } from '@/lib/ability'
import RequestButton from '../../RequestButton'
import { PlayButton } from '../PlayButton'
import { TrailerButton } from '../TrailerButton'
import MediaActionsRow from './MediaActionsRow'
import { MediaDownloadProgressBar } from './MediaDownloadProgressBar'
import type { MediaType } from '../../_types/media-page'
import type { PlaybackPlatform, PlayTarget } from '@/lib/playback-platform'

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
  /** Où ouvrir le média pour « Lire » (serveur de la plateforme de connexion) ; null : rien à lire */
  play: PlayTarget | null
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
  /** Plateforme de connexion (bouton « Lire dans … ») */
  platform: PlaybackPlatform
}

export default function MediaPrimaryActions({
  tmdbId,
  mediaType,
  title,
  availability,
  details,
  embyItem,
  play,
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
  platform,
}: MediaPrimaryActionsProps) {
  // Les comptes Onyx lisent via l'app Onyx : PlayButton se masque seul si ni Onyx ni serveur média ne conviennent
  const canPlay = Boolean(play)
  // Année de sortie : aide à retrouver le média sur Plex (bouton « Lire dans Plex »)
  const releaseYear = parseInt(String(details.release_date || details.first_air_date || '').slice(0, 4)) || undefined
  return (
    <div className="flex flex-col gap-3 sm:gap-5 pt-4 border-t border-white/5 w-full">
      {/* Téléphone : « Lire » (ou « Demander »), bande-annonce et menu sur la première
          ligne ; le statut et « Compléter » passent dessous */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <RequestButton
          className={canPlay ? 'order-last w-full sm:order-none sm:w-auto' : 'min-w-0 flex-1 sm:flex-none'}
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
          platformName={platform.name}
        />
        {play && (
          <div className="min-w-0 flex-1 sm:flex-none">
            <PlayButton
              embyUrl={play.serverUrl}
              embyItemId={play.itemId}
              serverId={play.serverId}
              tmdbId={tmdbId}
              mediaType={mediaType}
              platform={platform}
              title={title}
              originalTitle={details.original_title || details.original_name}
              year={releaseYear}
            />
          </div>
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
