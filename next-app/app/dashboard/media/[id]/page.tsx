import { getEmbyServiceForUser, getTmdbServiceForUser, getPlexServiceForUser, getJellyfinServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { defineAbilityFor } from '@/lib/ability'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import RequestButton from './RequestButton'
import { SeasonList } from '@/components/SeasonList'
import { PlayButton } from '@/components/PlayButton'
import { CastList } from '@/components/CastList'
import FullCreditsButton from './FullCreditsButton'
import { TrailerButton } from '@/components/TrailerButton'
import { ChevronRight, Clock } from 'lucide-react'
import { MediaSlider } from '@/components/MediaSlider'
import FavoriteButton from './FavoriteButton'
import WatchLaterButton from './WatchLaterButton'
import { ManageMediaButton } from './ManageMediaButton'
import { SubscribeButton } from './SubscribeButton'
import { getSubscriptionStatus } from './subscribe-actions'
import { SearchActions } from '@/components/SearchActions'
import { isInWatchLater } from '../watch-later-actions'
import { getSetting } from '@/lib/settings'
import { getMediaAvailability } from '@/lib/services/media-status'
import { DownloadStatusCard } from './DownloadStatusCard'
import { UserActivityButton } from '@/components/UserActivityButton'
import { CalendarButton } from '@/components/CalendarButton'

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


async function getImdbRating(imdbId: string) {
    try {
        // TMDB doesn't give IMDB rating directly, usually people use OMDb or similar
        // For now we'll return a placeholder or use TMDB vote average as fallback
        return null
    } catch (e) {
        return null
    }
}

export const dynamic = 'force-dynamic'

export default async function MediaDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ type?: string, source?: string, name?: string }> }) {
  const { id } = await params
  const { type, source, name } = await searchParams
  const mediaType = (type as 'movie' | 'tv') || 'movie'
  let tmdbId = parseInt(id)

  const normalizedSource = source ? source.toLowerCase() : undefined;
  const isExternalItem = (normalizedSource && ['emby', 'plex', 'jellyfin'].includes(normalizedSource)) || id.length > 15 || isNaN(Number(id));
  
  if (isExternalItem) {
      console.log(`[MediaPage] Processing External item: ${id}, source=${normalizedSource}`)
      let item: any = null;
      let providerName = normalizedSource ? normalizedSource.charAt(0).toUpperCase() + normalizedSource.slice(1) : 'Emby';

      if (normalizedSource === 'plex') {
          const plexService = await getPlexServiceForUser();
          if (plexService) {
             try {
                 item = await plexService.getItemDetails(id);
                 if (item) {
                     // Normalize Plex item
                     // Guid can be array of objects {id: "..."} or undefined
                     const guids = Array.isArray(item.Guid) ? item.Guid : [];
                     const tmdbGuid = guids.find((g: any) => g.id && g.id.startsWith('tmdb://'));
                     const imdbGuid = guids.find((g: any) => g.id && g.id.startsWith('imdb://'));
                     const tvdbGuid = guids.find((g: any) => g.id && g.id.startsWith('tvdb://'));
                     
                     item.ProviderIds = {
                         Tmdb: tmdbGuid ? tmdbGuid.id.replace('tmdb://', '') : null,
                         Imdb: imdbGuid ? imdbGuid.id.replace('imdb://', '') : null,
                         Tvdb: tvdbGuid ? tvdbGuid.id.replace('tvdb://', '') : null
                     };
                     item.Name = item.title;
                     item.Type = item.type === 'movie' ? 'Movie' : 'Series'; 
                     // Plex doesn't have explicit Type field like Emby in Metadata, but 'type' property
                 }
             } catch (e) { console.error('[MediaPage] Plex fetch error:', e) }
          }
      } else if (normalizedSource === 'jellyfin') {
          const jellyfinService = await getJellyfinServiceForUser();
          if (jellyfinService) {
              try {
                  item = await jellyfinService.getItemDetails(id);
              } catch (e) { console.error('[MediaPage] Jellyfin fetch error:', e) }
          }
      } else {
          // Default to Emby (including if source is undefined but ID is non-numeric/long)
          const embyService = await getEmbyServiceForUser()
          if (embyService) {
              try {
                  item = await embyService.getItemDetails(id)
                  console.log(`[MediaPage] Emby item found: ${item?.Name}, ProviderIds:`, item?.ProviderIds)
              } catch (e) {
                  // ignore
              }
          }
      }

      let itemTmdbId = null;

      if (item) {
          itemTmdbId = item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb || item.ProviderIds?.TMDB;
          
          if (!itemTmdbId) {
              const imdbId = item.ProviderIds?.Imdb || item.ProviderIds?.imdb || item.ProviderIds?.IMDB;
              const tvdbId = item.ProviderIds?.Tvdb || item.ProviderIds?.tvdb || item.ProviderIds?.TVDB;
              if (imdbId || tvdbId) {
                  const tmdbService = await getTmdbServiceForUser();
                  if (tmdbService) {
                      if (imdbId) {
                          const findResult = await tmdbService.findByExternalId(imdbId, 'imdb_id');
                          const foundItem = findResult?.movie_results?.[0] || findResult?.tv_results?.[0] || findResult?.tv_episode_results?.[0];
                          if (foundItem) itemTmdbId = foundItem.id;
                      }
                      if (!itemTmdbId && tvdbId) {
                          const findResult = await tmdbService.findByExternalId(tvdbId, 'tvdb_id');
                          const foundItem = findResult?.movie_results?.[0] || findResult?.tv_results?.[0] || findResult?.tv_episode_results?.[0];
                          if (foundItem) itemTmdbId = foundItem.id;
                      }
                  }
              }
          }
      }

      // FALLBACK: If item not found via provider, try to find by Name via TMDB
       if (!itemTmdbId) {
           if (name && name !== 'Unknown') {
              console.log(`[MediaPage] External item not found. Trying fallback search for "${name}"...`);
             const tmdbService = await getTmdbServiceForUser();
             if (tmdbService) {
                 try {
                     const searchResults = await tmdbService.searchMulti(decodeURIComponent(name));
                     const bestMatch = searchResults?.results?.[0];
                     
                     if (bestMatch) {
                         console.log(`[MediaPage] Fallback found: ${bestMatch.title || bestMatch.name} (${bestMatch.id})`);
                         itemTmdbId = bestMatch.id;
                         
                         const { redirect } = await import('next/navigation')
                         // Determine type if not provided
                         const targetType = bestMatch.media_type === 'tv' ? 'tv' : 'movie';
                         redirect(`/dashboard/media/${itemTmdbId}?type=${targetType}`);
                     }
                 } catch (e) {
                     console.error('[MediaPage] Fallback search failed:', e);
                 }
             }
          }
      }

      if (itemTmdbId) {
          const { redirect } = await import('next/navigation')
          redirect(`/dashboard/media/${itemTmdbId}?type=${item?.Type === 'Movie' ? 'movie' : 'tv'}`)
      }
      
      return (
        <div className="flex h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">Média Introuvable</h1>
          <p className="mb-8 text-gray-400">
            Ce média ({providerName}) n'est pas lié à une base de données publique (TMDB) et ne possède pas de page de détails.
            <br/>
            {item ? `Nom: ${item.Name}` : `ID: ${id}`}
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

  if (isNaN(tmdbId)) {
      notFound()
  }

  const tmdbService = await getTmdbServiceForUser()
  if (!tmdbService) {
      notFound()
  }

  const details = await tmdbService.getDetails(tmdbId, mediaType)
  
  if (!details) {
      notFound()
  }

  const user = await getCurrentUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ability = defineAbilityFor(user as any)
  
  if (ability.cannot('read', 'Media') && ability.cannot('read', 'Library')) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Accès Refusé</h1>
        <p className="mb-8 text-gray-400">Vous n'avez pas la permission de consulter ce contenu.</p>
        <Link 
          href="/dashboard" 
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Retour au tableau de bord
        </Link>
      </div>
    )
  }

  const embyService = await getEmbyServiceForUser()

  const videos = details.videos?.results || []
  const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')

  const rawCredits = mediaType === 'tv' ? (details.aggregate_credits || { cast: [], crew: [] }) : (details.credits || { cast: [], crew: [] })
  
  // Normaliser les crédits (TMDB utilise aggregate_credits pour les séries avec une structure différente)
  const normalizedCredits = {
    cast: (rawCredits.cast || []).map((c: any) => ({
        ...c,
        character: mediaType === 'tv' ? (c.roles?.map((r: any) => r.character).join(' / ') || c.character) : c.character
    })),
    crew: (rawCredits.crew || []).map((c: any) => ({
        ...c,
        job: mediaType === 'tv' ? (c.jobs?.map((j: any) => j.job).join(' / ') || c.job) : c.job
    }))
  }

  const cast = normalizedCredits.cast.slice(0, 25) // Top 25 pour le slider rapide

  const availability = await getMediaAvailability(tmdbId, mediaType, true)
  const isWatchLaterItem = await isInWatchLater(id, mediaType)
  const isSubscribed = await getSubscriptionStatus(id, mediaType)

  // TMDB Ratings and External IDs
  const ratingImdb = details.external_ids?.imdb_id ? await getImdbRating(details.external_ids.imdb_id) : null
  const tvdbId = details.external_ids?.tvdb_id
  const watchProviders = (details['watch/providers']?.results?.FR?.flatrate || [])
    .filter((p: any) => !p.provider_name.toLowerCase().includes('ads'))
  const keywords = (details.keywords?.keywords || details.keywords?.results || []).slice(0, 15)
  const director = normalizedCredits.crew?.find((c: any) => c.job === 'Director' || c.job === 'Executive Producer')?.name
  const writers = normalizedCredits.crew?.filter((c: any) => ['Screenplay', 'Writer', 'Story'].includes(c.job)).slice(0, 3).map((c: any) => c.name)
  const editors = normalizedCredits.crew?.filter((c: any) => c.job === 'Editor').slice(0, 2).map((c: any) => c.name)

  // Fetch User Progress from Emby
  let userProgress = null
  let embyUserId = null
  let seasonProgress: any[] = []
  let embyItem: any = null
  let embyServerId: string | null = null
  let isInCalendar = false
  
  if (user && user.email) {
      const dbUser = await (prisma as any).user.findUnique({
          where: { 
            email: user.email
          }
      })

      if (dbUser) {
          const calendarEvent = await (prisma as any).userCalendarEvent.findUnique({
              where: {
                  userId_tmdbId_mediaType: {
                      userId: dbUser.id,
                      tmdbId: tmdbId.toString(),
                      mediaType
                  }
              }
          })
          isInCalendar = !!calendarEvent
      }
      
      if (dbUser && dbUser.embyUserId && embyService) {
          embyUserId = dbUser.embyUserId
          try {
              embyItem = await embyService.getItemByTmdbId(dbUser.embyUserId, tmdbId, mediaType === 'movie' ? 'Movie' : 'Series')
              
              // Try to get server ID from item if available (ServerId property) or system info
              if (embyItem && embyItem.ServerId) {
                  embyServerId = embyItem.ServerId
              } else {
                  // Fallback to fetching system info
                  const sysInfo = await embyService.getSystemInfo()
                  if (sysInfo) embyServerId = sysInfo.Id
              }

              if (embyItem) {
                  if (embyItem.UserData) {
                      userProgress = {
                          played: embyItem.UserData.Played,
                          playedPercentage: embyItem.UserData.PlayedPercentage,
                          unplayedItemCount: embyItem.UserData.UnplayedItemCount,
                          playbackPositionTicks: embyItem.UserData.PlaybackPositionTicks,
                          totalEpisodes: mediaType === 'tv' && embyItem.RecursiveItemCount ? embyItem.RecursiveItemCount : undefined
                      }
                  }

                   // Calculate per-season progress for TV shows
                  if (mediaType === 'tv') {
                       log(`[MediaDetails] Fetching episodes for series ${embyItem.Id}`)
                       const allEpisodes = await embyService.getEpisodes(dbUser.embyUserId, embyItem.Id)
                       log(`[MediaDetails] Found ${allEpisodes.length} episodes`)
                       
                       // Recalculate progress if missing from UserData (common for Series)
                       if (userProgress && allEpisodes.length > 0) {
                           const playedCount = allEpisodes.filter((e: any) => e.UserData?.Played).length
                           // Use TMDB total episodes if available and greater than 0, otherwise fallback to Emby episode count
                           const totalEpisodes = details.number_of_episodes && details.number_of_episodes > 0 
                               ? details.number_of_episodes 
                               : allEpisodes.length

                           userProgress.playedPercentage = Math.min(100, (playedCount / totalEpisodes) * 100)
                           userProgress.totalEpisodes = totalEpisodes
                           userProgress.unplayedItemCount = Math.max(0, totalEpisodes - playedCount)
                       }

                       // Group by season
                       const progressMap = new Map<number, { played: number, total: number }>()
                       
                       allEpisodes.forEach((ep: any) => {
                           const seasonNum = ep.ParentIndexNumber
                           if (seasonNum === undefined) return
                           
                           if (!progressMap.has(seasonNum)) {
                               progressMap.set(seasonNum, { played: 0, total: 0 })
                           }
                           const stats = progressMap.get(seasonNum)!
                           stats.total++
                           if (ep.UserData?.Played) {
                               stats.played++
                           }
                       })

                       seasonProgress = Array.from(progressMap.entries()).map(([seasonNumber, stats]) => ({
                           seasonNumber,
                           played: stats.played,
                           total: stats.total,
                           isWatched: stats.played >= stats.total && stats.total > 0
                       }))
                  }
                  
                  if (userProgress) {
                      log('[MediaDetails] User Progress:', JSON.stringify(userProgress, null, 2))
                  }
              }
          } catch (e) {
              error('Failed to fetch Emby progress', e)
          }
      }
  }

  const embyUrl = await getSetting('emby_url')
  if (!embyUrl) {
      // This is not fatal but we should handle it if we want to show Play button
  }

  const title = details.title || details.name
  const overview = details.overview
  const releaseDate = details.release_date || details.first_air_date
  const backdropUrl = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null
  const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '/placeholder.png'
  
  const recommendations = details.recommendations?.results || []
  const similar = details.similar?.results || []

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-gray-300 overflow-x-hidden font-sans selection:bg-indigo-500/30">
        {/* Backdrop Fixe avec effet de profondeur */}
        <div className="fixed inset-0 h-screen w-full overflow-hidden z-0 pointer-events-none">
             {backdropUrl && (
                 <>
                    <img 
                        src={backdropUrl} 
                        alt={title} 
                        className="h-full w-full object-cover opacity-40 scale-105"
                    />
                    {/* Immersive Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/40 to-transparent"></div>
                    <div className="absolute inset-0 backdrop-blur-[1px]"></div>
                 </>
             )}
        </div>

        <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12">
            {/* Header Section (Jellyseerr Style) */}
            <div className="flex flex-col md:flex-row gap-10 items-start md:items-end mb-16">
                {/* Poster avec effet de lueur */}
                <div className="flex-shrink-0 mx-auto md:mx-0 w-full md:w-auto flex justify-center md:block">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 transition-transform duration-500 group-hover:scale-[1.02] group-hover:rotate-1 w-[220px] sm:w-[320px]">
                            <img 
                                src={posterUrl} 
                                alt={title} 
                                className="w-full h-auto aspect-[2/3] object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Title and Quick Actions */}
                <div className="flex-1 w-full min-w-0 space-y-8 pb-2">
                    <div className="flex flex-col gap-6">
                        <div className="space-y-3">
                            {availability.status && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {availability.status === 'pending' && (
                                        <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(99,102,241,0.2)]">Demandé</span>
                                    )}
                                    {availability.status === 'available' && (
                                        <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(74,222,128,0.2)]">Disponible</span>
                                    )}
                                    {availability.status === 'partial' && (
                                        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(168,85,247,0.2)]">Partiellement disponible</span>
                                    )}
                                </div>
                            )}
                            
                            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight break-words drop-shadow-lg tracking-tight">
                                {title} <span className="text-gray-500 font-thin">({releaseDate ? new Date(releaseDate).getFullYear() : ''})</span>
                            </h1>
                            
                            {mediaType === 'movie' && userProgress?.played && (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    <span>Vu</span>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-gray-400">
                                {details.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating && (
                                    <span className="border border-white/20 px-2 py-0.5 rounded text-xs text-gray-300 bg-white/5 backdrop-blur-sm">{details.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US').rating}</span>
                                )}
                                {details.runtime && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span>{Math.floor(details.runtime / 60)}h {details.runtime % 60}m</span>
                                    </div>
                                )}
                                {details.genres && (
                                    <div className="flex flex-wrap gap-2">
                                        {details.genres.map((g: any) => (
                                            <span key={g.id} className="text-gray-300 hover:text-white transition-colors cursor-default">• {g.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons aligned right */}
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

                            {mediaType === 'movie' && (ability.can('trigger_search', 'Media') || ability.can('interactive_search', 'Media')) && (
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
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                        <RequestButton 
                            tmdbId={tmdbId} 
                            mediaType={mediaType} 
                            title={title}
                            initialStatus={availability.status}
                            seasons={details.seasons}
                            seasonStatuses={(availability as any).seasons || []}
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
                            <TrailerButton 
                                youtubeId={trailer.key} 
                                title={title}
                            />
                         )}
                    </div>

                    {/* Download Status */}
                    <DownloadStatusCard 
                        tmdbId={tmdbId} 
                        mediaType={mediaType} 
                        tvdbId={tvdbId} 
                        title={title}
                    />

                    {/* Progress Bar (TV Series) */}
                    {mediaType === 'tv' && userProgress && userProgress.totalEpisodes > 0 && (
                        <div className="pt-2 max-w-md">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                <span className="text-gray-400">Progression</span>
                                <span className="text-white">{Math.round(userProgress.playedPercentage)}% <span className="text-gray-500 ml-1">({userProgress.totalEpisodes - userProgress.unplayedItemCount}/{userProgress.totalEpisodes})</span></span>
                            </div>
                            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${userProgress.playedPercentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Body Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                {/* Left Column (Overview, Crew, Keywords) */}
                <div className="xl:col-span-8 space-y-12">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">Résumé</h2>
                        <p className="text-lg text-gray-300 leading-relaxed">
                            {overview || "Aucun synopsis disponible."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4 pt-4">
                        {director && (
                            <div>
                                <h4 className="font-bold text-white text-sm">Réalisateur</h4>
                                <p className="text-gray-400 text-sm">{director}</p>
                            </div>
                        )}
                        {writers && writers.length > 0 && writers.map((w: string, i: number) => (
                            <div key={i}>
                                <h4 className="font-bold text-white text-sm">Scénario</h4>
                                <p className="text-gray-400 text-sm">{w}</p>
                            </div>
                        ))}
                        {editors && editors.length > 0 && editors.map((e: string, i: number) => (
                            <div key={i}>
                                <h4 className="font-bold text-white text-sm">Montage</h4>
                                <p className="text-gray-400 text-sm">{e}</p>
                            </div>
                        ))}
                    </div>

                    {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-8">
                            {keywords.map((k: any) => (
                                <Link 
                                    key={k.id} 
                                    href={`/dashboard/media/discover?keyword=${k.id}&name=${encodeURIComponent(k.name)}`}
                                    className="px-3 py-1 bg-gray-800/30 border border-gray-700/50 rounded-full text-xs text-gray-500 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-500/50 transition flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    {k.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column (Technical Sidebar Table Style) */}
                <div className="xl:col-span-4 space-y-4">
                    {/* Collection Link (if exists) */}
                    {details.belongs_to_collection && (
                        <div className="relative group overflow-hidden rounded-xl border border-white/5 bg-gray-900/20">
                            <div className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition" style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w500${details.belongs_to_collection.backdrop_path})` }}></div>
                            <div className="relative p-4 flex items-center justify-between">
                                <span className="text-white font-medium text-sm">{details.belongs_to_collection.name}</span>
                                <Link 
                                    href={`/dashboard/media/collection/${details.belongs_to_collection.id}`}
                                    className="px-3 py-1 bg-gray-800/80 rounded text-[10px] text-gray-300 hover:text-white transition"
                                >
                                    Voir
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Technical Info Table */}
                    <div className="bg-gray-900/40 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
                        {/* Rating Row */}
                        <div className="flex items-center justify-center gap-8 py-4 bg-white/5 rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <span className="bg-[#f5c518] text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">IMDb</span>
                                <span className="text-white font-bold text-sm">{details.vote_average?.toFixed(1) || '0.0'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-[#01d277] text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">TMDB</span>
                                <span className="text-white font-bold text-sm">{Math.round((details.vote_average || 0) * 10)}%</span>
                            </div>
                        </div>

                        <div className="divide-y divide-white/5">
                            <div className="grid grid-cols-2 p-4 text-xs">
                                <span className="text-gray-500 font-bold">Titre original</span>
                                <span className="text-gray-300 text-right">{details.original_title || details.original_name}</span>
                            </div>
                            <div className="grid grid-cols-2 p-4 text-xs">
                                <span className="text-gray-500 font-bold">Statut</span>
                                <span className="text-gray-300 text-right">{details.status}</span>
                            </div>
                            <div className="grid grid-cols-2 p-4 text-xs">
                                <span className="text-gray-500 font-bold">Date de sortie</span>
                                <span className="text-gray-300 text-right flex items-center justify-end gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    {releaseDate ? new Date(releaseDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Inconnue'}
                                </span>
                            </div>
                            {details.revenue !== undefined && details.revenue > 0 && (
                                <div className="grid grid-cols-2 p-4 text-xs">
                                    <span className="text-gray-500 font-bold">Revenu</span>
                                    <span className="text-gray-300 text-right">{details.revenue?.toLocaleString('fr-FR')} $US</span>
                                </div>
                            )}
                            {details.budget !== undefined && details.budget > 0 && (
                                <div className="grid grid-cols-2 p-4 text-xs">
                                    <span className="text-gray-500 font-bold">Budget</span>
                                    <span className="text-gray-300 text-right">{details.budget?.toLocaleString('fr-FR')} $US</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 p-4 text-xs">
                                <span className="text-gray-500 font-bold">Langue originale</span>
                                <span className="text-gray-300 text-right uppercase">{details.original_language}</span>
                            </div>
                            {details.production_countries && details.production_countries.length > 0 && (
                                <div className="grid grid-cols-2 p-4 text-xs">
                                    <span className="text-gray-500 font-bold">Pays de production</span>
                                    <span className="text-gray-300 text-right">{details.production_countries[0].name}</span>
                                </div>
                            )}
                            <div className="p-4 space-y-2">
                                <span className="text-gray-500 text-[11px] font-bold block">Studios</span>
                                <div className="flex flex-col items-end gap-1">
                                    {details.production_companies?.slice(0, 3).map((c: any) => (
                                        <span key={c.id} className="text-gray-300 text-[11px] text-right leading-tight">{c.name}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Watch Providers - Integrated Row */}
                        {watchProviders.length > 0 && (
                            <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 bg-white/[0.02] rounded-b-xl">
                                <span className="text-gray-500 text-[11px] font-bold">Disponible sur</span>
                                <div className="flex gap-2">
                                    {watchProviders.map((provider: any) => (
                                        <div key={provider.provider_id} className="group relative">
                                            <img 
                                                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                                                alt={provider.provider_name}
                                                className="w-5 h-5 rounded-md shadow-md border border-white/10 group-hover:scale-110 transition duration-300"
                                            />
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">
                                                {provider.provider_name}
                                                {/* Arrow */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="mt-16 space-y-16">
                <div className="space-y-12">
                    {/* Seasons List (only for TV) - MOVED ABOVE CAST */}
                    {mediaType === 'tv' && details.seasons && (
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-6">Saisons</h2>
                            <SeasonList 
                                tvId={tmdbId} 
                                tvdbId={tvdbId}
                                title={title}
                                seasons={details.seasons} 
                                seasonStatuses={(availability as any).seasons || []}
                                seasonProgress={seasonProgress}
                                canTriggerSearch={ability.can('trigger_search', 'Media')}
                                canInteractiveSearch={ability.can('interactive_search', 'Media')}
                            />
                        </section>
                    )}

                    {/* Cast Section */}
                    <section>
                        <FullCreditsButton 
                            cast={normalizedCredits.cast || []} 
                            crew={normalizedCredits.crew || []} 
                        >
                            <div className="group flex items-center gap-2 mb-6 cursor-pointer w-fit">
                                <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    Casting
                                </h2>
                                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all translate-y-[1px]" />
                            </div>
                        </FullCreditsButton>
                        <CastList cast={cast} />
                    </section>
                </div>

                {/* Recommendations & Similar - FULL WIDTH */}
                <div className="space-y-16">
                    {recommendations.length > 0 && (
                        <MediaSlider 
                            title="Recommandations" 
                            items={recommendations} 
                            mediaType={mediaType}
                            viewAllLink={`/dashboard/media/${tmdbId}/recommendations?type=${mediaType}`}
                        />
                    )}

                    {similar.length > 0 && (
                        <MediaSlider 
                            title="Titres similaires" 
                            items={similar} 
                            mediaType={mediaType}
                            viewAllLink={`/dashboard/media/${tmdbId}/similar?type=${mediaType}`}
                        />
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

