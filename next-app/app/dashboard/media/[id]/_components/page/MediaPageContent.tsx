import { SeasonList } from '../SeasonList'
import { UserActivityButton } from '../UserActivityButton'
import MediaBackdrop from './MediaBackdrop'
import MediaAvailabilityBadges from './MediaAvailabilityBadges'
import MediaTitleHeader from './MediaTitleHeader'
import MediaPrimaryActions from './MediaPrimaryActions'
import MediaSidebar from './MediaSidebar'
import MediaOverviewSection from './MediaOverviewSection'
import MediaCastSection from './MediaCastSection'
import MediaRelatedSliders from './MediaRelatedSliders'
import type { MediaPageData } from '../../_services/media-page-data'
import type { MediaType } from '../../_types/media-page'

interface MediaPageContentProps {
  data: MediaPageData
  id: string
  tmdbId: number
  mediaType: MediaType
}

export function MediaPageContent({ data, id, tmdbId, mediaType }: MediaPageContentProps) {
  const {
    details,
    ability,
    availability,
    isWatchLaterItem,
    isSubscribed,
    embyUrl,
    credits: normalizedCredits,
    meta,
    progress,
    requestAllSeasonsEnabled,
  } = data

  const { director, writers, editors, keywords, watchProviders } = meta
  const {
    embyItem,
    embyServerId,
    userProgress,
    seasonProgress,
    isInCalendar,
  } = progress

  const videos = details.videos?.results || []
  const trailer = videos.find(
    (v: { type?: string; site?: string }) => v.type === 'Trailer' && v.site === 'YouTube'
  )

  const cast = normalizedCredits.cast.slice(0, 25)

  const tvdbId = details.external_ids?.tvdb_id

  const title = details.title || details.name
  const overview = details.overview
  const releaseDate = details.release_date || details.first_air_date
  const backdropUrl = details.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : null
  const posterUrl = details.poster_path
    ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
    : '/placeholder.png'

  const recommendations = details.recommendations?.results || []
  const similar = details.similar?.results || []

  const contentRating = details.content_ratings?.results?.find(
    (r: { iso_3166_1?: string; rating?: string }) => r.iso_3166_1 === 'US'
  )?.rating

  const logos = details.images?.logos || []
  const bestLogo = logos.find((l: any) => l.iso_639_1 === 'fr') ||
                   logos.find((l: any) => l.iso_639_1 === 'en') ||
                   logos[0]
  const logoPath = bestLogo?.file_path

  return (
    // Bord à bord : on annule les marges du <main> (px-2/4/6, py-8) et on remonte
    // sous la barre de navigation (h-16) pour que l'image de fond démarre en haut.
    <div className="relative -mx-2 sm:-mx-4 lg:-mx-6 -mt-24 min-h-screen bg-[#0c0d0d] text-gray-300 overflow-x-hidden font-sans selection:bg-indigo-500/30">
      <MediaBackdrop backdropUrl={backdropUrl} alt={title} />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pt-36 pb-12 sm:px-8 lg:px-12">
        {/* Header Section (Hero Backdrop Layout) */}
        <div className="relative flex flex-col justify-end min-h-[35vh] md:min-h-[50vh] pt-16 pb-6 mb-12">
          {/* onyx-hero-copy : textes qui tombent en place quand l'affiche atterrit (motion.css) */}
          <div className="onyx-hero-copy max-w-6xl space-y-6">
            <div className="onyx-stagger space-y-4">
              <MediaAvailabilityBadges status={availability.status} />
              <MediaTitleHeader
                title={title}
                releaseDate={releaseDate}
                mediaType={mediaType}
                watched={!!userProgress?.played}
                contentRating={contentRating}
                runtime={details.runtime}
                genres={details.genres}
                logoPath={logoPath}
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <MediaPrimaryActions
                tmdbId={tmdbId}
                mediaType={mediaType}
                title={title}
                availability={availability}
                details={details}
                embyItem={embyItem}
                embyServerId={embyServerId}
                embyUrl={embyUrl}
                trailer={trailer}
                ability={ability}
                requestAllSeasonsEnabled={requestAllSeasonsEnabled}
                id={id}
                isWatchLaterItem={isWatchLaterItem}
                isSubscribed={isSubscribed}
                isInCalendar={isInCalendar}
                tvdbId={tvdbId}
                canManageSettings={ability.can('manage_settings', 'Media')}
                canTriggerSearch={ability.can('trigger_search', 'Media')}
                canInteractiveSearch={ability.can('interactive_search', 'Media')}
              />
            </div>
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="onyx-reveal grid grid-cols-1 xl:grid-cols-12 gap-12">
          <MediaOverviewSection
            overview={overview}
            director={director}
            writers={writers}
            editors={editors}
            keywords={keywords}
          />
          <MediaSidebar
            details={details}
            releaseDate={releaseDate}
            watchProviders={watchProviders}
          />
        </div>

        {/* Content Body */}
        <div className="mt-16 space-y-16">
          <div className="space-y-12">
            {mediaType === 'tv' && details.seasons && (
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold text-white">Saisons</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    {embyItem && (
                      <UserActivityButton
                        tmdbId={tmdbId}
                        mediaType={mediaType}
                        title={title}
                      />
                    )}
                    {userProgress &&
                      userProgress.totalEpisodes !== undefined &&
                      userProgress.totalEpisodes > 0 && (
                        <div className="flex items-center gap-3 w-full sm:w-64">
                          <div className="flex-1 relative h-2 rounded-full overflow-hidden bg-gray-800/60 border border-white/5">
                            <div
                              className="onyx-grow absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                              style={{
                                width: `${userProgress.playedPercentage}%`,
                                background: 'linear-gradient(90deg, #9a9794, #f2f0ed)',
                                boxShadow: '0 0 8px rgba(232,230,228,0.24)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white whitespace-nowrap">
                            {Math.round(userProgress.playedPercentage)}%
                            <span className="text-gray-500 ml-1 font-normal">
                              ({userProgress.totalEpisodes - userProgress.unplayedItemCount}/{userProgress.totalEpisodes})
                            </span>
                          </span>
                        </div>
                      )}
                  </div>
                </div>
                <SeasonList
                  tvId={tmdbId}
                  tvdbId={tvdbId}
                  title={title}
                  seasons={details.seasons}
                  seasonStatuses={availability.seasons || []}
                  seasonProgress={seasonProgress}
                  canTriggerSearch={ability.can('trigger_search', 'Media')}
                  canInteractiveSearch={ability.can('interactive_search', 'Media')}
                  canRequest={ability.can('create', 'MediaRequest')}
                />
              </section>
            )}
            <MediaCastSection credits={normalizedCredits} cast={cast} />
          </div>
          <MediaRelatedSliders
            recommendations={recommendations}
            similar={similar}
            mediaType={mediaType}
            tmdbId={tmdbId}
          />
        </div>
      </div>
    </div>
  )
}
