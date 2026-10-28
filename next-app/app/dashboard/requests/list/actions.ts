'use server'

import { getCurrentUser, getTmdbServiceForUser, getRadarrServiceForUser, getSonarrServiceForUser } from '@/lib/auth'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getTmdbService } from '@/lib/services/tmdb'
import { db } from '@/lib/db/drizzle'
import { users, mediaRequests } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getMediaAvailability } from '@/lib/services/media-status'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


export async function forceSyncRequests() {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Unauthorized' }
        
        const ability = defineAbilityFor(user)
        if (!ability.can('sync', 'MediaRequest')) {
             return { success: false, error: 'Forbidden' }
        }
        
        let importedCount = 0
        
        // Import from Radarr
        const radarr = await getRadarrService()
        const tmdbService = await getTmdbService()

        if (radarr && tmdbService) {
            const movies = await radarr.getMovies()
            // Filter: monitored AND (not available OR not hasFile)
            const missingMovies = movies.filter(m => m.monitored && !m.hasFile)
            
            for (const movie of missingMovies) {
                const existing = await db.query.mediaRequests.findFirst({
                    where: and(
                        eq(mediaRequests.mediaType, 'movie'),
                        eq(mediaRequests.tmdbId, movie.tmdbId.toString())
                    )
                })
                
                // Get correct poster from TMDB if possible
                let posterPath = movie.images?.find((i: { coverType: string; url: string }) => i.coverType === 'poster')?.url
                try {
                    const tmdbDetails = await tmdbService.getDetails(movie.tmdbId, 'movie')
                    if (tmdbDetails && tmdbDetails.poster_path) {
                        posterPath = tmdbDetails.poster_path
                    }
                } catch (e) {
                    error('[Sync] Failed to fetch TMDB details for movie', movie.tmdbId)
                }

                if (!existing) {
                    await db.insert(mediaRequests).values({
                        mediaType: 'movie',
                        tmdbId: movie.tmdbId.toString(),
                        title: movie.title,
                        status: 1, // PENDING
                        requesterName: 'Imported',
                        requestedAt: new Date(movie.added),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        metadata: JSON.stringify({
                            year: movie.year,
                            overview: movie.overview,
                            posterPath: posterPath
                        })
                    })
                    importedCount++
                } else {
                    // Update metadata if poster is missing or different (optional, but good for fixing broken images)
                    const currentMeta = existing.metadata ? JSON.parse(existing.metadata) : {}
                    if (!currentMeta.posterPath || (posterPath && posterPath.startsWith('/') && !currentMeta.posterPath.startsWith('/'))) {
                         await db.update(mediaRequests)
                            .set({
                                metadata: JSON.stringify({
                                    ...currentMeta,
                                    posterPath: posterPath
                                }),
                                updatedAt: new Date()
                            })
                            .where(eq(mediaRequests.id, existing.id))
                    }
                }
            }
        }
        
        // Import from Sonarr
        const sonarr = await getSonarrService()
        
        if (sonarr && tmdbService) {
            const seriesList = await sonarr.getSeries()
            
            // Filter series that have at least one season monitored and missing episodes
            // The user specifically requested to check per season
            const missingSeries = seriesList.filter(s => {
                // Check if any season is monitored and not fully available
                // We use percentOfEpisodes < 100 to ensure we only request what is missing
                return s.seasons.some(season => 
                    season.monitored && 
                    season.statistics && 
                    season.statistics.percentOfEpisodes < 100
                )
            })
            
            log(`[Sync] Found ${missingSeries.length} series with missing monitored seasons from Sonarr`)
            
            for (const series of missingSeries) {
                 let tmdbId: string | null = null
                 
                 // Try to find by TVDB ID
                 if (series.tvdbId) {
                     const findResult = await tmdbService.findByExternalId(series.tvdbId, 'tvdb_id')
                     if (findResult && findResult.tv_results && findResult.tv_results.length > 0) {
                         tmdbId = findResult.tv_results[0].id.toString()
                     }
                 }
                 
                 // If not found, try IMDB ID
                 if (!tmdbId && series.imdbId) {
                     const findResult = await tmdbService.findByExternalId(series.imdbId, 'imdb_id')
                     if (findResult && findResult.tv_results && findResult.tv_results.length > 0) {
                         tmdbId = findResult.tv_results[0].id.toString()
                     }
                 }
                 
                 if (tmdbId) {
                    const existing = await db.query.mediaRequests.findFirst({
                        where: and(
                            eq(mediaRequests.mediaType, 'tv'),
                            eq(mediaRequests.tmdbId, tmdbId)
                        )
                    })

                    // Get correct poster from TMDB if possible
                    let posterPath = series.images?.find((i: any) => i.coverType === 'poster')?.url
                    try {
                        const tmdbDetails = await tmdbService.getDetails(parseInt(tmdbId), 'tv')
                        if (tmdbDetails && tmdbDetails.poster_path) {
                            posterPath = tmdbDetails.poster_path
                        }
                    } catch (e) {
                        error('[Sync] Failed to fetch TMDB details for series', tmdbId)
                    }
                    
                    if (!existing) {
                        // Identify which seasons are missing
                        const missingSeasons = series.seasons
                            .filter(s => s.monitored && s.statistics && s.statistics.percentOfEpisodes < 100)
                            .map(s => s.seasonNumber)

                        await db.insert(mediaRequests).values({
                            mediaType: 'tv',
                            tmdbId: tmdbId,
                            title: series.title,
                            status: 1, // PENDING
                            requesterName: 'Imported',
                            requestedAt: new Date(series.added),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            metadata: JSON.stringify({
                                year: series.year,
                                overview: series.overview,
                                posterPath: posterPath,
                                seasons: missingSeasons
                            })
                        })
                        importedCount++
                    } else {
                         // Update metadata if poster is missing or different
                         const currentMeta = existing.metadata ? JSON.parse(existing.metadata) : {}
                         if (!currentMeta.posterPath || (posterPath && posterPath.startsWith('/') && !currentMeta.posterPath.startsWith('/'))) {
                              await db.update(mediaRequests)
                                 .set({
                                     metadata: JSON.stringify({
                                         ...currentMeta,
                                         posterPath: posterPath
                                     }),
                                     updatedAt: new Date()
                                 })
                                 .where(eq(mediaRequests.id, existing.id))
                         }
                    }
                 }
            }
        }
        
        // Clear cache
        const requests = await db.query.mediaRequests.findMany()
        const { forget } = await import('@/lib/cache')
        for (const req of requests) {
            forget(`media_availability_${req.mediaType}_${req.tmdbId}`)
        }
        
        revalidatePath('/dashboard/requests/list')
        return { 
            success: true, 
            syncedCount: requests.length,
            importedCount
        }
    } catch (e) {
        error('Failed to force sync requests:', e)
        return { success: false }
    }
}

export async function fetchUserRequests(page: number, pageSize: number = 20) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return { results: [], total: 0, totalPages: 0 }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.email, user.email)
    })
    
    if (!dbUser) return { results: [], total: 0, totalPages: 0 }

    const tmdbService = await getTmdbServiceForUser()
    const skip = (page - 1) * pageSize
    
    log(`[FetchRequests] User role: ${dbUser.role}, fetching all requests`)
    
    // Read from local DB instead of Jellyseerr API
    const [requests, total] = await Promise.all([
        db.query.mediaRequests.findMany({
            orderBy: sql`requested_at DESC`,
            offset: skip,
            limit: pageSize
        }),
        db.$count(mediaRequests)
    ])

    // Map DB format to the format expected by the UI
    const enrichedRequests = await Promise.all(requests.map(async (req: Record<string, unknown>) => {
        let metadata: Record<string, unknown> = {}
        try {
            metadata = req.metadata ? JSON.parse(req.metadata as string) : {}
        } catch (e) {}

        let status = req.status as number;
        
        // Fix posterPath - same logic as dashboard
        let posterPath = metadata.posterPath as string | undefined | null;
        const tmdbIdNum = parseInt(String(req.tmdbId));
        
        // If posterPath is missing or looks like a local Sonarr/Radarr path, try to get from TMDB
        if ((!posterPath || (typeof posterPath === 'string' && posterPath.includes('MediaCover')) || posterPath === 'null' || posterPath === 'undefined') && !isNaN(tmdbIdNum) && tmdbService) {
            try {
                const details = await tmdbService.getDetails(tmdbIdNum, req.mediaType as 'movie' | 'tv');
                if (details && details.poster_path) {
                    posterPath = details.poster_path;
                    // Update metadata with the correct poster
                    metadata.posterPath = posterPath;
                }
            } catch (e) {
                // Silent fail - keep existing posterPath if any
            }
        }

        // Check availability and enrich metadata if poster is missing
        try {
            if (isNaN(tmdbIdNum)) {
                error(`[FetchRequests] Invalid TMDB ID for request ${req.id}: ${req.tmdbId}`);
                return {
                    id: req.id,
                    externalId: req.externalId,
                    type: req.mediaType,
                    status: req.status,
                    createdAt: req.requestedAt,
                    isOnEmby: req.isOnEmby,
                    embyItemId: req.embyItemId,
                    media: {
                        tmdbId: req.tmdbId,
                        title: req.title,
                        ...metadata
                    },
                    requestedBy: {
                        displayName: req.requesterName,
                        email: req.requesterEmail
                    }
                }
            }

            const availability = await getMediaAvailability(tmdbIdNum, req.mediaType as 'movie' | 'tv');
            
            // Map MediaStatus to numeric status
            // 1=PENDING, 2=APPROVED/PROCESSING, 3=PROCESSING, 4=PARTIAL, 5=AVAILABLE
            if (availability.status === 'available') {
                status = 5;
            } else if (availability.status === 'partial') {
                status = 4;
            } else if (availability.status === 'processing') {
                status = 3;
            }

            // Update DB if status changed
            if (status !== req.status) {
                await db.update(mediaRequests)
                    .set({ status, updatedAt: new Date() })
                    .where(eq(mediaRequests.id, req.id as number));
                // V1 notifications supprimées - plus d'envoi de notifications externes
                if (status === 5) {
                    log(`[FetchRequests] Media ${req.title} is now available - V1 notifications removed`);
                }
            }
            
            // If we have local metadata, use it, otherwise try to get from availability/TMDB if possible
            // But usually metadata is stored on creation
            
            return {
                id: req.id,
                externalId: req.externalId,
                type: req.mediaType,
                status: status,
                // Demandé mais pas encore sorti : affiché « En attente de sortie »
                awaitingRelease: availability.status === 'unreleased' && status < 4,
                releaseDate: availability.releaseDate,
                createdAt: req.requestedAt,
                isOnEmby: req.isOnEmby,
                embyItemId: req.embyItemId,
                media: {
                    tmdbId: req.tmdbId,
                    title: req.title,
                    ...metadata
                },
                requestedBy: {
                    displayName: req.requesterName,
                    email: req.requesterEmail
                }
            }
        } catch (e) {
            error(`[FetchRequests] Error processing request ${req.id}:`, e);
            return {
                id: req.id,
                externalId: req.externalId,
                type: req.mediaType,
                status: req.status,
                createdAt: req.requestedAt,
                isOnEmby: req.isOnEmby,
                embyItemId: req.embyItemId,
                media: {
                    tmdbId: req.tmdbId,
                    title: req.title,
                    ...metadata
                },
                requestedBy: {
                    displayName: req.requesterName,
                    email: req.requesterEmail
                }
            }
        }
    }))

    return {
        results: enrichedRequests,
        total: total,
        totalPages: Math.ceil(total / pageSize)
    }
  } catch (e) {
    error('Error fetching user requests:', e)
    return { results: [], total: 0, totalPages: 0 }
  }
}