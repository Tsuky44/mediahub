import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { defineAbilityFor } from '@/lib/ability'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Patch 15: Zod schema de validation du body
const requestBodySchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1).max(500),
  posterPath: z.string().nullable().optional(),
  seasons: z.array(z.number().int().min(0)).optional()
})

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(request: NextRequest) {
  // Patch 16: Rate limiting — max 20 requêtes/minute par IP
  const ip = getClientIp(request)
  const rl = checkRateLimit(`request:${ip}`, { windowMs: 60_000, max: 20 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes, veuillez patienter.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ability = defineAbilityFor(user)
  if (!ability.can('create', 'MediaRequest')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
  }

  try {
    // Patch 15: Validation Zod du body
    const rawBody = await request.json()
    const parsed = requestBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }
    const { tmdbId, mediaType, title, posterPath, seasons: requestedSeasonIds } = parsed.data

    let result: { success: boolean; message?: string; data?: any } = { success: false, message: 'Unknown error' }
    let externalId: string | undefined

    // Variables hoistées pour réutilisation après le bloc TV (Patch 3: évite double fetch)
    let capturedTvdbId: number | undefined
    let capturedLookupSeasons: number[] | undefined

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
        const lookup = await sonarrService.getSeriesByTvdbId(tvdbId)
        if (!lookup) {
            return NextResponse.json({ error: 'Series not found in Sonarr lookup' }, { status: 404 })
        }

        // Hoisté pour réutilisation plus bas sans re-fetch (Patch 3)
        capturedTvdbId = tvdbId
        capturedLookupSeasons = lookup.seasons.map((s: any) => s.seasonNumber)

        let seasonsToRequest = [...capturedLookupSeasons]
        
        // If specific seasons are provided in the body, use them
        if (requestedSeasonIds && requestedSeasonIds.length > 0) {
            const requestedSeasons = requestedSeasonIds
            if (requestedSeasons.length > 0) {
                // Fetch other active requests to maintain monitoring for previously requested seasons
                const activeRequests = await prisma.mediaRequest.findMany({
                    where: { 
                        tmdbId: tmdbId.toString()
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
        // Get user info (needed for DB update and notifications)
        const dbUser = await prisma.user.findFirst({ 
            where: { email: user.email || '' } 
        })

        // Immediate Local DB Update
        try {
            const requestStatus = 2 // PENDING/PROCESSING equivalent
            
            // ALWAYS create a new request instead of merging for TV series
            // Movies can still be merged/updated as they don't have seasons
            let existingRequest = null
            if (mediaType === 'movie') {
                if (externalId) {
                    existingRequest = await prisma.mediaRequest.findFirst({
                        where: { externalId: externalId }
                    })
                }
                
                if (!existingRequest) {
                     existingRequest = await prisma.mediaRequest.findFirst({
                        where: { tmdbId: tmdbId.toString() }
                     })
                }
            }

            let seasons: number[] = []
            if (mediaType === 'tv') {
                if (requestedSeasonIds && requestedSeasonIds.length > 0) {
                    seasons = requestedSeasonIds
                } else if (capturedLookupSeasons) {
                    // Patch 3: Réutilise les données déjà fetchées, pas de second appel Sonarr/TMDB
                    seasons = capturedLookupSeasons
                }
            }

            if (existingRequest && mediaType === 'movie') {
                const updatedRequest = await prisma.mediaRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: requestStatus,
                        updatedAt: new Date(),
                        externalId: externalId || existingRequest.externalId
                    }
                })
                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', updatedRequest.id.toString(), { tmdbId, mediaType, title })
            } else if (mediaType === 'tv' && seasons.length > 0) {
                // Patch 4: Pre-fetch une seule fois puis parse en JS (remplace le string-matching fragile en boucle)
                const existingTvRequests = await prisma.mediaRequest.findMany({
                    where: { tmdbId: tmdbId.toString(), mediaType: 'tv' },
                    select: { id: true, metadata: true }
                })
                const alreadyRequestedSeasons = new Set<number>(
                    existingTvRequests.flatMap(req => {
                        try {
                            const meta = JSON.parse(req.metadata || '{}')
                            return Array.isArray(meta.seasons) ? meta.seasons : []
                        } catch { return [] }
                    })
                )

                // Create separate requests for each season to allow individual management
                for (const seasonNum of seasons) {
                    if (alreadyRequestedSeasons.has(seasonNum)) {
                        log(`[Request API] Season ${seasonNum} already requested, skipping duplicate entry creation`)
                        continue
                    }

                    const newRequest = await prisma.mediaRequest.create({
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
                    await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id.toString(), { tmdbId, mediaType, title, season: seasonNum })
                }
            } else {
                const newRequest = await prisma.mediaRequest.create({
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
                            seasons: seasons.length > 0 ? seasons.sort((a: number, b: number) => a - b) : undefined
                        }),
                        requestedAt: new Date()
                    }
                })
                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id.toString(), { tmdbId, mediaType, title })
            }

            log(`[Request API] Immediate local DB update success for ${title}`)
        } catch (dbError) {
            error('[Request API] Failed to update local DB immediately:', dbError)
            // Non-blocking error, we continue
        }

        // Invalidate cache
        forget(`media_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbId}`)
        revalidatePath('/dashboard/requests/list') // Refresh list immediately

        // Send external notification
        try {
            const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
            let overview = ''
            let rating = ''
            let genres = ''
            let year = ''
            let notifPosterPath: string | null = posterPath ?? null

            try {
                const tmdbService = await getTmdbService()
                if (tmdbService) {
                    const details = await tmdbService.getDetails(tmdbId, mediaType as any)
                    if (details) {
                        overview = details.overview || ''
                        rating = details.vote_average?.toFixed(1) || ''
                        year = mediaType === 'movie' 
                            ? (details.release_date?.substring(0, 4) || '')
                            : (details.first_air_date?.substring(0, 4) || '')
                        if (details.genres) {
                            genres = details.genres.map((g: any) => g.name).join(', ')
                        }
                        if (!notifPosterPath && details.poster_path) {
                            notifPosterPath = details.poster_path
                        }
                    }
                }
            } catch (tmdbErr) {
                console.error('[Request API] TMDB fetch failed for notification, sending without enriched data:', tmdbErr)
            }

            const parsedSeasons: number[] = requestedSeasonIds ?? [];

            await ExternalNotificationService.send('media_request', {
                title: 'Nouvelle demande de média',
                message: `L'utilisateur ${user.name || user.email} a demandé ${title}.`,
                data: {
                    tmdbId,
                    mediaType,
                    title,
                    posterPath: notifPosterPath,
                    overview,
                    rating,
                    genres,
                    year,
                    episodes: (parsedSeasons.length > 0) ? `Saisons ${parsedSeasons.join(', ')}` : undefined,
                    user: user.name || user.email
                }
            }, dbUser?.id)

            // Notifications V2 — independent module, coexists with legacy
            try {
                const { Notify } = await import('@/lib/notifications-v2')
                Notify.mediaRequested(
                    {
                        tmdbId: String(tmdbId),
                        mediaType: mediaType as 'movie' | 'tv',
                        title,
                        year,
                        overview,
                        posterPath: notifPosterPath ?? undefined,
                        genres,
                        rating,
                    },
                    dbUser ? {
                        id: dbUser.id,
                        name: dbUser.name ?? undefined,
                        email: dbUser.email ?? undefined,
                        whatsappNumber: (dbUser as any).whatsappNumber ?? undefined,
                    } : undefined
                )
            } catch (v2Err) {
                console.error('[Request API] NotificationsV2 emit failed:', v2Err)
            }
        } catch (notifError) {
            console.error('[Request API] Failed to send external notification:', notifError)
        }

        return NextResponse.json(result)
    } else {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

  } catch (e: any) {
    error('Request failed', e)
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
  }
}
