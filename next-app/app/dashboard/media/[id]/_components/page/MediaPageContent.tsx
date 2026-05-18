import { SeasonList } from '../SeasonList'
import { DownloadStatusCard } from '../../DownloadStatusCard'
import MediaBackdrop from './MediaBackdrop'
import MediaPosterImage from './MediaPosterImage'
import MediaAvailabilityBadges from './MediaAvailabilityBadges'
import MediaTitleHeader from './MediaTitleHeader'
import MediaActionsRow from './MediaActionsRow'
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

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-gray-300 overflow-x-hidden font-sans selection:bg-indigo-500/30">
      <MediaBackdrop backdropUrl={backdropUrl} alt={title} />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-10 items-start md:items-end mb-16">
          <MediaPosterImage posterUrl={posterUrl} alt={title} />

          <div className="flex-1 w-full min-w-0 space-y-8 pb-2">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <MediaAvailabilityBadges status={availability.status} />
                <MediaTitleHeader
                  title={title}
                  releaseDate={releaseDate}
                  mediaType={mediaType}
                  watched={!!userProgress?.played}
                  contentRating={contentRating}
                  runtime={details.runtime}
                  genres={details.genres}
                />
              </div>

              <MediaActionsRow
                id={id}
                tmdbId={tmdbId}
                mediaType={mediaType}
                title={title}
                releaseDate={releaseDate}
                details={details}
                embyItem={embyItem}
                isWatchLaterItem={isWatchLaterItem}
                isSubscribed={isSubscribed}
                isInCalendar={isInCalendar}
                tvdbId={tvdbId}
                ability={ability}
              />
            </div>

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
            />

            <DownloadStatusCard tmdbId={tmdbId} mediaType={mediaType} tvdbId={tvdbId} title={title} />
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
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
                  {userProgress &&
                    userProgress.totalEpisodes !== undefined &&
                    userProgress.totalEpisodes > 0 && (
                      <div className="flex items-center gap-3 w-full sm:w-64">
                        <div className="flex-1 relative h-2 rounded-full overflow-hidden bg-gray-800/60 border border-white/5">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                            style={{
                              width: `${userProgress.playedPercentage}%`,
                              background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                              boxShadow: '0 0 8px rgba(168,85,247,0.6)',
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
                <SeasonList
                  tvId={tmdbId}
                  tvdbId={tvdbId}
                  title={title}
                  seasons={details.seasons}
                  seasonStatuses={availability.seasons || []}
                  seasonProgress={seasonProgress}
                  canTriggerSearch={ability.can('trigger_search', 'Media')}
                  canInteractiveSearch={ability.can('interactive_search', 'Media')}
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
