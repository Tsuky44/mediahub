import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SeasonList } from './_components/SeasonList'
import { DownloadStatusCard } from './DownloadStatusCard'
import {
  isExternalMediaId,
  resolveExternalItem,
} from './_services/external-item-resolver'
import { loadMediaPageData } from './_services/media-page-data'
import type { MediaSearchParams, MediaType } from './_types/media-page'
import MediaBackdrop from './_components/page/MediaBackdrop'
import MediaPosterImage from './_components/page/MediaPosterImage'
import MediaAvailabilityBadges from './_components/page/MediaAvailabilityBadges'
import MediaTitleHeader from './_components/page/MediaTitleHeader'
import MediaActionsRow from './_components/page/MediaActionsRow'
import MediaPrimaryActions from './_components/page/MediaPrimaryActions'
import MediaProgressBar from './_components/page/MediaProgressBar'
import MediaSidebar from './_components/page/MediaSidebar'
import MediaOverviewSection from './_components/page/MediaOverviewSection'
import MediaCastSection from './_components/page/MediaCastSection'
import MediaRelatedSliders from './_components/page/MediaRelatedSliders'

export const dynamic = 'force-dynamic'

export default async function MediaDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<MediaSearchParams>
}) {
  const { id } = await params
  const { type, source, name } = await searchParams
  const mediaType: MediaType = (type as MediaType) || 'movie'

  if (isExternalMediaId(id, source)) {
    const resolution = await resolveExternalItem({ id, source, name })
    if (resolution.kind === 'redirect') {
      redirect(
        `/dashboard/media/${resolution.tmdbId}?type=${resolution.mediaType}`
      )
    }
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Média Introuvable</h1>
        <p className="mb-8 text-gray-400">
          Ce média ({resolution.providerName}) n'est pas lié à une base de
          données publique (TMDB) et ne possède pas de page de détails.
          <br />
          {resolution.itemName ? `Nom: ${resolution.itemName}` : `ID: ${id}`}
        </p>
        <Link
          href="/dashboard/stats"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Retour aux statistiques
        </Link>
      </div>
    )
  }

  const tmdbId = parseInt(id)
  if (isNaN(tmdbId)) {
    notFound()
  }

  const result = await loadMediaPageData({
    tmdbId,
    mediaType,
    externalId: id,
  })

  if (result.kind === 'not-found') {
    notFound()
  }

  if (result.kind === 'access-denied') {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Accès Refusé</h1>
        <p className="mb-8 text-gray-400">
          Vous n'avez pas la permission de consulter ce contenu.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Retour au tableau de bord
        </Link>
      </div>
    )
  }

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
  } = result.data
  const { director, writers, editors, keywords, watchProviders } = meta
  const {
    embyItem,
    embyServerId,
    userProgress,
    seasonProgress,
    isInCalendar,
  } = progress

  const videos = details.videos?.results || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trailer = videos.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  )

  const cast = normalizedCredits.cast.slice(0, 25)

  const tvdbId = details.external_ids?.tvdb_id

  const title = details.title || details.name
  const overview = details.overview
  const releaseDate = details.release_date || details.first_air_date
  const backdropUrl = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null
  const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '/placeholder.png'
  
  const recommendations = details.recommendations?.results || []
  const similar = details.similar?.results || []

  const contentRating = details.content_ratings?.results?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => r.iso_3166_1 === 'US'
  )?.rating

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-gray-300 overflow-x-hidden font-sans selection:bg-indigo-500/30">
        <MediaBackdrop backdropUrl={backdropUrl} alt={title} />

        <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
            {/* Header Section (Jellyseerr Style) */}
            <div className="flex flex-col md:flex-row gap-10 items-start md:items-end mb-16">
                <MediaPosterImage posterUrl={posterUrl} alt={title} />

                {/* Title and Quick Actions */}
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
                    />

                    {/* Download Status */}
                    <DownloadStatusCard 
                        tmdbId={tmdbId} 
                        mediaType={mediaType} 
                        tvdbId={tvdbId} 
                        title={title}
                    />

                    {/* Progress Bar (TV Series) */}
                    {mediaType === 'tv' &&
                        userProgress &&
                        userProgress.totalEpisodes !== undefined &&
                        userProgress.totalEpisodes > 0 && (
                            <MediaProgressBar
                                userProgress={userProgress}
                                totalEpisodes={userProgress.totalEpisodes}
                            />
                        )}
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
                            <h2 className="text-2xl font-bold text-white mb-6">Saisons</h2>
                            <SeasonList
                                tvId={tmdbId}
                                tvdbId={tvdbId}
                                title={title}
                                seasons={details.seasons}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                seasonStatuses={(availability as any).seasons || []}
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

