import { NextRequest, NextResponse } from 'next/server'
import { getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser, getCurrentUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const instanceId = parseInt((user as any).instanceId)

  try {
    const body = await request.json()
    const { tmdbId, mediaType, title, posterPath } = body

    if (!tmdbId || !mediaType) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    let result: { success: boolean; message?: string; data?: any } = { success: false, message: 'Unknown error' }
    let externalId: string | undefined

    if (mediaType === 'movie') {
        const radarrService = await getRadarrServiceForUser()
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
            title,
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
        const sonarrService = await getSonarrServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
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
        const lookup = await sonarrService.getSeriesByTvdbId(tvdbId)
        if (!lookup) {
            return NextResponse.json({ error: 'Series not found in Sonarr lookup' }, { status: 404 })
        }

        let seasonsToRequest = lookup.seasons.map(s => s.seasonNumber)
        
        // If specific seasons are provided in the body, use them
        if (body.seasons) {
            const requestedSeasons = Array.isArray(body.seasons) ? body.seasons : [body.seasons]
            if (requestedSeasons.length > 0) {
                // Fetch other active requests to maintain monitoring for previously requested seasons
                const activeRequests = await (prisma as any).mediaRequest.findMany({
                    where: { 
                        tmdbId: tmdbId.toString(),
                        instanceId
                    }
                })
                
                const seasonsFromRequests = new Set<number>(requestedSeasons)
                activeRequests.forEach((req: any) => {
                    try {
                        const metadata = req.metadata ? JSON.parse(req.metadata) : {}
                        const seasons = (metadata as any).seasons || []
                        seasons.forEach((s: number) => seasonsFromRequests.add(s))
                    } catch (e) {}
                })
                
                seasonsToRequest = Array.from(seasonsFromRequests)
            }
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
        // Immediate Local DB Update
        try {
            const requestStatus = 2 // PENDING/PROCESSING equivalent
            
            // Get user info
            const dbUser = await (prisma as any).user.findFirst({ 
                where: { email: user.email || '', instanceId } 
            })
            
            // ALWAYS create a new request instead of merging for TV series
            // Movies can still be merged/updated as they don't have seasons
            let existingRequest = null
            if (mediaType === 'movie') {
                if (externalId) {
                    existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { externalId: externalId, instanceId }
                    })
                }
                
                if (!existingRequest) {
                     existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { tmdbId: tmdbId.toString(), instanceId }
                     })
                }
            }

            let seasons: number[] = []
            if (mediaType === 'tv') {
                if (body.seasons) {
                    seasons = Array.isArray(body.seasons) ? body.seasons : [body.seasons]
                } else {
                    // Fallback to all seasons if it's a new series request without specific seasons
                    const sonarrService = await getSonarrServiceForUser()
                    const tmdbService = await getTmdbServiceForUser()
                    if (sonarrService && tmdbService) {
                        const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
                        if (externalIds?.tvdb_id) {
                            const lookup = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
                            if (lookup) {
                                seasons = lookup.seasons.map((s: any) => s.seasonNumber)
                            }
                        }
                    }
                }
            }

            if (existingRequest && mediaType === 'movie') {
                await (prisma as any).mediaRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: requestStatus,
                        updatedAt: new Date(),
                        externalId: externalId || existingRequest.externalId
                    }
                })
            } else if (mediaType === 'tv' && seasons.length > 0) {
                // Create separate requests for each season to allow individual management
                for (const seasonNum of seasons) {
                    // Check if this specific season is already requested to avoid duplicates
                    const existingSeasonRequest = await (prisma as any).mediaRequest.findFirst({
                        where: {
                            tmdbId: tmdbId.toString(),
                            instanceId,
                            mediaType: 'tv',
                            metadata: {
                                contains: `"seasons":[${seasonNum}]`
                            }
                        }
                    })

                    if (existingSeasonRequest) {
                        console.log(`[Request API] Season ${seasonNum} already requested, skipping duplicate entry creation`)
                        continue
                    }

                    await (prisma as any).mediaRequest.create({
                        data: {
                            instanceId,
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
                }
            } else {
                await (prisma as any).mediaRequest.create({
                    data: {
                        instanceId,
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
                            seasons: seasons.length > 0 ? seasons.sort((a: number, b: number) => a - b) : undefined
                        }),
                        requestedAt: new Date()
                    }
                })
            }

            console.log(`[Request API] Immediate local DB update success for ${title}`)
        } catch (dbError) {
            console.error('[Request API] Failed to update local DB immediately:', dbError)
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

  } catch (e: any) {
    console.error('Request failed', e)
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
  }
}
