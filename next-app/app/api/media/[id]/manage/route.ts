import { NextResponse } from 'next/server'
import { getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser, getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { mediaRequests, settings, notificationEvents, episodeBatches } from '@/lib/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getMediaAvailability } from '@/lib/services/media-status'
import { forget } from '@/lib/cache'
import { defineAbilityFor } from '@/lib/ability'
import { logger } from '@/lib/logger'


export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'Media') && !ability.can('manage_settings', 'Media')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    if (action === 'status') {
      // Force status to "Available" (5) in local DB
      await db.update(mediaRequests).set({ status: 5 }).where(eq(mediaRequests.tmdbId, tmdbIdStr))
      
      forget(`media_availability_movie_${tmdbIdStr}`)
      forget(`media_availability_tv_${tmdbIdStr}`)
      revalidatePath(`/dashboard/media/${tmdbIdStr}`)
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.error('[API Manage] POST Error:', error)
    return NextResponse.json({ error: (error as Error).message || 'Internal error' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get('type') as 'movie' | 'tv'
  const refresh = searchParams.get('refresh') === 'true'

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'Media') && !ability.can('manage_settings', 'Media')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  if (!mediaType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 })
  }

  try {
    const tmdbId = parseInt(tmdbIdStr)
    if (isNaN(tmdbId)) {
        return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 })
    }

    const availability = await getMediaAvailability(tmdbId, mediaType, refresh)
    
    // Get local requests
    const requests = await db.select().from(mediaRequests)
        .where(eq(mediaRequests.tmdbId, tmdbIdStr))
        .orderBy(desc(mediaRequests.requestedAt))

    // Get service URL
    let externalServiceUrl = null
    if (availability && availability.details && availability.details.id) {
        try {
            if (mediaType === 'movie') {
                const [radarrUrl] = await db.select().from(settings).where(eq(settings.key, 'radarr_url')).limit(1)
                if (radarrUrl?.value) {
                    externalServiceUrl = `${radarrUrl.value.replace(/\/$/, '')}/movie/${availability.details.id}`
                }
            } else {
                const [sonarrUrl] = await db.select().from(settings).where(eq(settings.key, 'sonarr_url')).limit(1)
                if (sonarrUrl?.value) {
                    externalServiceUrl = `${sonarrUrl.value.replace(/\/$/, '')}/series/${availability.details.id}`
                }
            }
        } catch (e) {
            logger.warn('[API Manage] Failed to build service URL:', e)
        }
    }
    
    return NextResponse.json({
        availability,
        requests: requests.map((req) => {
            let seasons: number[] = []
            try {
                if (req.metadata) {
                    const meta = JSON.parse(req.metadata) as { seasons?: number[] }
                    seasons = meta.seasons || []
                }
            } catch (e) {
                logger.warn(`[API Manage] Failed to parse metadata for request ${req.id}:`, e)
            }

            return {
                id: req.id,
                status: req.status,
                createdAt: req.requestedAt,
                requestedBy: {
                    displayName: req.requesterName,
                    email: req.requesterEmail
                },
                seasons
            }
        }),
        externalServiceUrl
    })
  } catch (error) {
    logger.error('[API Manage] Error:', error)
    return NextResponse.json({ error: `Failed to fetch media info: ${(error as Error).message || 'Unknown error'}` }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ability = defineAbilityFor(user)
  const canManageMedia = ability.can('manage', 'Media') || ability.can('manage_settings', 'Media')
  const canDeleteRequest = ability.can('delete', 'MediaRequest')

  const { id: tmdbIdStr } = await params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'media' or 'request'
  const targetId = searchParams.get('targetId') // Can be comma separated IDs
  const mediaType = searchParams.get('type') as 'movie' | 'tv'
  const deleteFiles = searchParams.get('deleteFiles') === 'true'

  if (action === 'media' && !canManageMedia) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  if (action === 'request' && !canManageMedia && !canDeleteRequest) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  const radarrService = await getRadarrServiceForUser()
  const sonarrService = await getSonarrServiceForUser()
  const tmdbService = await getTmdbServiceForUser()

  try {
    const tmdbId = parseInt(tmdbIdStr)
    
    let result: { success: boolean; message?: string } = { success: false };
    
    if (action === 'media') {
        // Delete from Radarr/Sonarr
        if (mediaType === 'movie') {
            if (!radarrService) return NextResponse.json({ error: 'Radarr unavailable' }, { status: 503 })
            
            const movie = await radarrService.getMovieByTmdbId(tmdbId)
            if (movie && movie.id) {
                result = await radarrService.deleteMovie(movie.id, deleteFiles)
            } else {
                return NextResponse.json({ error: 'Movie not found in Radarr' }, { status: 404 })
            }
        } else if (mediaType === 'tv') {
             if (!sonarrService || !tmdbService) return NextResponse.json({ error: 'Sonarr/TMDB unavailable' }, { status: 503 })
             
             // Get TVDB ID first
             const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
             if (!externalIds?.tvdb_id) return NextResponse.json({ error: 'TVDB ID not found' }, { status: 404 })
             
             const series = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
             if (series && series.id) {
                 result = await sonarrService.deleteSeries(series.id, deleteFiles)
             } else {
                 return NextResponse.json({ error: 'Series not found in Sonarr' }, { status: 404 })
             }
        }
        
        if (result.success) {
             // Delete local request
             await db.delete(mediaRequests).where(eq(mediaRequests.tmdbId, tmdbIdStr))

             // Clean up notification dedup keys for this media
             await db.delete(notificationEvents).where(eq(notificationEvents.tmdbId, tmdbIdStr))

             // Clean up episode batches for this media
             await db.delete(episodeBatches).where(eq(episodeBatches.tmdbId, tmdbIdStr))

             try {
                 const { logAction } = await import('@/lib/audit')
                 await logAction(
                    parseInt(user?.id ?? '0'),
                    'MEDIA_DELETE',
                    'Media',
                    tmdbIdStr,
                    { mediaType, tmdbId, action: 'media', deleteFiles }
                )
            } catch (e) {
                logger.error('Failed to log media deletion:', e)
            }
        }
    } else if (action === 'request') {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        
        const targetIds = targetId.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
        if (targetIds.length === 0) return NextResponse.json({ error: 'Invalid targetId' }, { status: 400 })

        for (const currentTargetId of targetIds) {
            // Find the request to know what to unmonitor
            const [mediaRequest] = await db.select().from(mediaRequests).where(eq(mediaRequests.id, currentTargetId)).limit(1)

            if (!mediaRequest) continue;

            if (mediaType === 'tv') {
                if (sonarrService && tmdbService) {
                    const metadata = mediaRequest.metadata ? JSON.parse(mediaRequest.metadata) : {}
                    const seasonsToDelete = metadata.seasons || []
                    
                    // Find all OTHER requests for this series (excluding ALL requests being deleted in this batch)
                    const otherRequests = await db.select().from(mediaRequests).where(
                        and(eq(mediaRequests.tmdbId, tmdbIdStr), sql`${mediaRequests.id} NOT IN (${targetIds.join(',')})`)
                    )

                    const stillRequestedSeasons = new Set<number>()
                    otherRequests.forEach((req: { metadata?: string | null }) => {
                        try {
                            const meta = req.metadata ? JSON.parse(req.metadata) as { seasons?: number[] } : {}
                            const seasons = meta.seasons || []
                            seasons.forEach((s: number) => stillRequestedSeasons.add(s))
                        } catch (e) {}
                    })

                    const finalSeasonsToUnmonitor = seasonsToDelete.filter((s: number) => !stillRequestedSeasons.has(s))

                    const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
                    if (externalIds?.tvdb_id) {
                        try {
                            if (finalSeasonsToUnmonitor.length > 0) {
                                const unmonitorResult = await sonarrService.unmonitorSeasons(externalIds.tvdb_id, finalSeasonsToUnmonitor)
                                
                                if (unmonitorResult.success && unmonitorResult.series) {
                                    const series = unmonitorResult.series
                                    const isAnySeasonMonitored = series.seasons?.some((s: { seasonNumber?: number; monitored?: boolean }) => s.seasonNumber && s.seasonNumber > 0 && s.monitored)
                                    const hasFiles = series.statistics?.episodeFileCount > 0
                                    
                                    if (!isAnySeasonMonitored && !hasFiles && series.id) {
                                        logger.info(`[API Manage] Auto-deleting series ${series.id} from Sonarr (no monitored seasons and no files)`)
                                        await sonarrService.deleteSeries(series.id, false)
                                    }
                                }
                            } else {
                                // Even if no seasons were unmonitored now, check if we should delete the series
                                const series = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
                                if (series && series.id) {
                                    const isAnySeasonMonitored = series.seasons?.some((s: { seasonNumber?: number; monitored?: boolean }) => s.seasonNumber && s.seasonNumber > 0 && s.monitored)
                                    const hasFiles = series.statistics?.episodeFileCount > 0
                                    
                                    if (!isAnySeasonMonitored && !hasFiles) {
                                        logger.info(`[API Manage] Auto-deleting empty series ${series.id} from Sonarr`)
                                        await sonarrService.deleteSeries(series.id, false)
                                    }
                                }
                            }
                        } catch (e) {
                            logger.warn('[API Manage] Sonarr cleanup failed (series might already be gone):', e)
                        }
                    }
                }
            } else if (mediaType === 'movie') {
                if (radarrService) {
                    const unmonitorResult = await radarrService.unmonitorMovie(tmdbId)
                    if (unmonitorResult.success && unmonitorResult.movie) {
                        const movie = unmonitorResult.movie
                        if (!movie.monitored && !movie.hasFile && movie.id) {
                            logger.info(`[API Manage] Auto-deleting movie ${movie.id} from Radarr (not monitored and no files)`)
                            await radarrService.deleteMovie(movie.id, false)
                        }
                    }
                }
            }

            // Just delete the local DB entry
            const [deletedRequest] = await db.delete(mediaRequests).where(eq(mediaRequests.id, currentTargetId)).returning()

            // Clean up notification dedup keys for this media (so re-requesting triggers notifications again)
            await db.delete(notificationEvents).where(eq(notificationEvents.tmdbId, tmdbIdStr))

            // Clean up episode batches for this media
            await db.delete(episodeBatches).where(eq(episodeBatches.tmdbId, tmdbIdStr))

            try {
                const { logAction } = await import('@/lib/audit')
                await logAction(
                    parseInt(user?.id ?? '0'),
                    'REQUEST_DELETE',
                    'MediaRequest',
                    currentTargetId.toString(),
                    {
                        tmdbId: tmdbIdStr,
                        mediaType,
                        title: deletedRequest?.title,
                        action: 'request'
                    }
                )
            } catch (e) {
                logger.error('Failed to log request deletion:', e)
            }
        }
        result = { success: true }
    }

    if (result.success) {
       const tmdbId = parseInt(tmdbIdStr)
       forget(`media_availability_${mediaType}_${tmdbId}`)
       revalidatePath(`/dashboard/media/${tmdbIdStr}`)
       revalidatePath('/dashboard/requests/list')
       
       return NextResponse.json({ success: true })
    } else {
       return NextResponse.json({ error: result.message || 'Action failed' }, { status: 500 })
    }

  } catch (error) {
    logger.error('[API Manage] Delete Error:', error)
    return NextResponse.json({ error: (error as Error).message || 'Internal error' }, { status: 500 })
  }
}
