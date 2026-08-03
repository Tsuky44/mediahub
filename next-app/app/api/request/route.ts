import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { defineAbilityFor } from '@/lib/ability'
import { logger } from '@/lib/logger'
import { authenticatePlayerIntegration } from '@/lib/integrations/player-integration-auth'


export async function POST(request: NextRequest) {
  const user = (await getCurrentUser()) || (await authenticatePlayerIntegration(request))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ability = defineAbilityFor(user)
  if (!ability.can('create', 'MediaRequest')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  try {
    const body = await request.json() as { tmdbId: number; mediaType: 'movie' | 'tv'; title?: string; posterPath?: string; seasons?: number | number[] }
    const { tmdbId, mediaType, title, posterPath } = body

    if (!tmdbId || !mediaType) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Pre-fetch user info and TMDB details for notification
    // (dispatched early to prevent race conditions with Sonarr/Radarr webhooks)
    const dbUser = await (prisma as any).user.findFirst({ where: { id: parseInt(user.id) } })

    let notifOverview: string | undefined
    let notifYear: string | undefined
    let notifGenres: string | undefined
    let notifPosterPath: string | undefined = posterPath

    try {
        const tmdbServiceForNotif = await getTmdbService()
        if (tmdbServiceForNotif) {
            const details = await tmdbServiceForNotif.getDetails(parseInt(String(tmdbId)), mediaType)
            if (details) {
                notifOverview = details.overview || undefined
                notifYear = mediaType === 'movie'
                    ? (details.release_date?.substring(0, 4) || undefined)
                    : (details.first_air_date?.substring(0, 4) || undefined)
                if (details.genres) {
                    notifGenres = details.genres.map((g: { name?: string }) => g.name).join(', ')
                }
                if (!notifPosterPath && details.poster_path) {
                    notifPosterPath = details.poster_path
                }
            }
        }
    } catch (e) {
        logger.warn('[Request API] Failed to pre-fetch TMDB details for notification:', e)
    }

    let result: { success: boolean; message?: string; data?: unknown } = { success: false, message: 'Unknown error' }
    let externalId: string | undefined

    if (mediaType === 'movie') {
        const radarrService = await getRadarrService()
        if (!radarrService) {
            return NextResponse.json({ error: 'Radarr not configured' }, { status: 503 })
        }

        const profiles = await radarrService.getProfiles()
        const rootFolders = await radarrService.getRootFolders()
        
        if (!profiles.length || !rootFolders.length) {
            return NextResponse.json({ error: 'Radarr configuration incomplete (profiles/root folders missing)' }, { status: 500 })
        }

        const qualityProfileId = profiles[0].id
        const rootFolderPath = rootFolders[0].path

        const addResult = await radarrService.addMovie({
            tmdbId,
            title: title || 'Unknown',
            qualityProfileId,
            rootFolderPath,
            year: 0, // Radarr lookup will fill this
            minimumAvailability: 'announced',
            monitored: true,
            searchNow: true
        })

        result = {
            success: addResult.success,
            message: addResult.message,
            data: addResult.movie
        }
        if (addResult.movie?.id) externalId = addResult.movie.id.toString()

    } else if (mediaType === 'tv') {
        const sonarrService = await getSonarrService()
        const tmdbService = await getTmdbService()
        
        if (!sonarrService || !tmdbService) {
            return NextResponse.json({ error: 'Sonarr or TMDB not configured' }, { status: 503 })
        }

        // Get TVDB ID
        const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
        if (!externalIds || !externalIds.tvdb_id) {
            return NextResponse.json({ error: 'Could not find TVDB ID for this series' }, { status: 404 })
        }
        const tvdbId = externalIds.tvdb_id

        const profiles = await sonarrService.getProfiles()
        const rootFolders = await sonarrService.getRootFolders()
        const languageProfiles = await sonarrService.getLanguageProfiles()
        
        if (!profiles.length || !rootFolders.length) {
            return NextResponse.json({ error: 'Sonarr configuration incomplete (profiles/root folders missing)' }, { status: 500 })
        }

        // Lookup series to get seasons
        const lookup = await sonarrService.lookupSeriesByTvdbId(tvdbId)
        if (!lookup) {
            return NextResponse.json({ error: 'Series not found in Sonarr lookup' }, { status: 404 })
        }

        let seasonsToRequest: number[] = []
        
        // If specific seasons are provided in the body, use them
        if (body.seasons) {
            const requestedSeasons = Array.isArray(body.seasons) ? body.seasons : [body.seasons]
            if (requestedSeasons.length > 0) {
                // Fetch other active requests to maintain monitoring for previously requested seasons
                const activeRequests = await (prisma as any).mediaRequest.findMany({
                    where: { 
                        tmdbId: tmdbId.toString()
                    }
                })
                
                const seasonsFromRequests = new Set<number>(requestedSeasons)
                activeRequests.forEach((req: { metadata?: string | null }) => {
                    try {
                        const metadata = req.metadata ? JSON.parse(req.metadata) as { seasons?: number[] } : {}
                        const seasons = metadata.seasons || []
                        seasons.forEach((s: number) => seasonsFromRequests.add(s))
                    } catch (e) {}
                })
                
                seasonsToRequest = Array.from(seasonsFromRequests)
            }
        } else {
            // Only use all seasons if no specific seasons were requested
            seasonsToRequest = lookup.seasons.map((s: { seasonNumber: number }) => s.seasonNumber)
        }

        const addResult = await sonarrService.addSeries({
            tvdbid: tvdbId,
            title: title || lookup.title,
            qualityProfileId: profiles[0].id,
            rootFolderPath: rootFolders[0].path,
            languageProfileId: languageProfiles?.[0]?.id,
            seasons: seasonsToRequest,
            seasonFolder: true,
            seriesType: 'standard',
            monitored: true,
            searchNow: true
        })

        result = {
            success: addResult.success,
            message: addResult.message,
            data: addResult.series
        }
        if (addResult.series?.id) externalId = addResult.series.id.toString()
    }

    if (result.success) {
        // Notify V2 — MEDIA_REQUESTED (dispatched IMMEDIATELY before DB update
        // to prevent race conditions with Sonarr/Radarr webhooks arriving first)
        try {
            const { Notify } = await import('@/lib/notifications-v2')
            const { formatSeasonList } = await import('@/lib/notifications-v2/utils/season-formatter')

            const parsedSeasons: number[] = body.seasons
                ? (Array.isArray(body.seasons) ? body.seasons : [body.seasons])
                : []
            const seasonLabel =
                parsedSeasons.length === 1
                    ? `Saison ${parsedSeasons[0]}`
                    : parsedSeasons.length > 1
                      ? formatSeasonList(parsedSeasons)
                      : undefined
            const displayTitle = seasonLabel ? `${title} — ${seasonLabel}` : (title || 'Sans titre')

            await Notify.mediaRequested(
                {
                    tmdbId: String(tmdbId),
                    mediaType,
                    title: displayTitle,
                    year: notifYear,
                    overview: notifOverview,
                    posterPath: notifPosterPath,
                    genres: notifGenres,
                    seasonNumber: parsedSeasons.length === 1 ? parsedSeasons[0] : undefined,
                },
                dbUser ? {
                    id: dbUser.id,
                    name: dbUser.name ?? undefined,
                    email: dbUser.email ?? undefined,
                    whatsappNumber: dbUser.whatsappNumber ?? undefined,
                } : undefined
            )
        } catch (notifError) {
            logger.error('[Request API] Failed to dispatch Notify V2 MEDIA_REQUESTED:', notifError)
        }

        // Immediate Local DB Update
        try {
            const requestStatus = 2 // PENDING/PROCESSING equivalent
            
            // ALWAYS create a new request instead of merging for TV series
            // Movies can still be merged/updated as they don't have seasons
            let existingRequest = null
            if (mediaType === 'movie') {
                if (externalId) {
                    existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { externalId: externalId }
                    })
                }
                
                if (!existingRequest) {
                     existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { tmdbId: tmdbId.toString() }
                     })
                }
            }

            let seasons: number[] = []
            if (mediaType === 'tv') {
                if (body.seasons) {
                    seasons = Array.isArray(body.seasons) ? body.seasons : [body.seasons]
                } else {
                    // Fallback to all seasons if it's a new series request without specific seasons
                    const sonarrService = await getSonarrService()
                    const tmdbService = await getTmdbService()
                    if (sonarrService && tmdbService) {
                        const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
                        if (externalIds?.tvdb_id) {
                            const lookupMeta = await sonarrService.lookupSeriesByTvdbId(externalIds.tvdb_id)
                            if (lookupMeta) {
                                seasons = lookupMeta.seasons.map((s: { seasonNumber: number }) => s.seasonNumber)
                            }
                        }
                    }
                }
            }

            if (existingRequest && mediaType === 'movie') {
                const updatedRequest = await (prisma as any).mediaRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: requestStatus,
                        updatedAt: new Date(),
                        externalId: externalId || existingRequest.externalId
                    }
                })
                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', updatedRequest.id, { tmdbId, mediaType, title })
            } else if (mediaType === 'tv' && seasons.length > 0) {
                // Create separate requests for each season to allow individual management
                for (const seasonNum of seasons) {
                    // Check if this specific season is already requested to avoid duplicates
                    const existingSeasonRequest = await (prisma as any).mediaRequest.findFirst({
                        where: {
                            tmdbId: tmdbId.toString(),
                            mediaType: 'tv',
                            metadata: {
                                contains: `"seasons":[${seasonNum}]`
                            }
                        }
                    })

                    if (existingSeasonRequest) {
                        logger.info(`[Request API] Season ${seasonNum} already requested, skipping duplicate entry creation`)
                        continue
                    }

                    const newRequest = await (prisma as any).mediaRequest.create({
                        data: {
                            externalId: externalId || `pending_${tmdbId}_${Date.now()}_s${seasonNum}`,
                            tmdbId: tmdbId.toString(),
                            mediaType: mediaType,
                            title: title || 'Sans titre',
                            status: requestStatus,
                            userId: dbUser?.id,
                            requesterName: user.name || dbUser?.name,
                            requesterEmail: user.email,
                            metadata: JSON.stringify({
                                posterPath: posterPath,
                                seasons: [seasonNum]
                            }),
                            requestedAt: new Date()
                        }
                    })
                    const { logAction } = await import('@/lib/audit')
                    await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id, { tmdbId, mediaType, title, season: seasonNum })
                }
            } else {
                const newRequest = await (prisma as any).mediaRequest.create({
                    data: {
                        externalId: externalId || `pending_${tmdbId}_${Date.now()}`,
                        tmdbId: tmdbId.toString(),
                        mediaType: mediaType,
                        title: title || 'Sans titre',
                        status: requestStatus,
                        userId: dbUser?.id,
                        requesterName: user.name || dbUser?.name,
                        requesterEmail: user.email,
                        metadata: JSON.stringify({
                            posterPath: posterPath,
                            seasons: seasons.length > 0 ? seasons.sort((a, b) => a - b) : undefined
                        }),
                        requestedAt: new Date()
                    }
                })
                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id, { tmdbId, mediaType, title })
            }

            logger.info(`[Request API] Immediate local DB update success for ${title}`)
        } catch (dbError) {
            logger.error('[Request API] Failed to update local DB immediately:', dbError)
            // Non-blocking error, we continue
        }

        // Invalidate cache
        forget(`media_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbId}`)
        revalidatePath('/dashboard/requests/list') // Refresh list immediately

        return NextResponse.json(result)
    } else {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

  } catch (e) {
    logger.error('Request failed', e)
    return NextResponse.json({ error: (e as Error).message || 'Internal Server Error' }, { status: 500 })
  }
}
