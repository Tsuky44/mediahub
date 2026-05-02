'use server'

import { getEmbyServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { forget } from '@/lib/cache'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  try {
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return null

    const tmdbData = await tmdbService.getSeasonDetails(tvId, seasonNumber)
    if (!tmdbData) return null

    // Fetch user info for filtering
    const user = await getCurrentUser()
    const embyService = await getEmbyServiceForUser()

    let embyUserId: string | undefined = undefined
    if (user && user.email) {
        const dbUser = await prisma.user.findFirst({ 
          where: { 
            email: user.email
          } 
        })
        if (dbUser && dbUser.embyUserId) {
            embyUserId = dbUser.embyUserId
        }
    }

    // Fetch Emby data to check played status
    interface EmbyEpisode {
        IndexNumber?: number
        UserData?: {
            Played?: boolean
            PlayedPercentage?: number
        }
    }
    let embyEpisodes: EmbyEpisode[] = []
    if (embyUserId && embyService) {
         const embySeries = await embyService.getItemByTmdbId(embyUserId, tvId, 'Series')
         const seriesId = (embySeries as { Id?: string | number }).Id
         if (seriesId) {
             embyEpisodes = await embyService.getEpisodes(embyUserId, String(seriesId), seasonNumber) as EmbyEpisode[]
         }
    }

    // Merge everything into TMDB episodes
    if (tmdbData.episodes) {
        tmdbData.episodes = tmdbData.episodes.map((ep: Record<string, unknown>) => {
            const embyEp = embyEpisodes.find((e: EmbyEpisode) => e.IndexNumber === ep.episode_number)
            
            return {
                ...ep,
                userData: {
                    played: embyEp?.UserData?.Played || false,
                    playedPercentage: embyEp?.UserData?.PlayedPercentage
                }
            }
        })
    }

    return tmdbData
  } catch (e) {
    error('Error fetching season details:', e)
    return null
  }
}

export async function requestSeason(tvId: number, seasonNumber: number, title: string) {
    try {
        const user = await getCurrentUser()
        const ability = defineAbilityFor(user)
        if (!ability.can('create', 'MediaRequest')) {
            return { success: false, message: 'Forbidden' }
        }

        const sonarrService = await getSonarrServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!sonarrService || !tmdbService) {
            return { success: false, message: 'Sonarr or TMDB not configured' }
        }

        // Get TVDB ID
        const externalIds = await tmdbService.getExternalIds('tv', tvId)
        if (!externalIds || !externalIds.tvdb_id) {
            return { success: false, message: 'Could not find TVDB ID' }
        }
        const tvdbId = externalIds.tvdb_id

        const profiles = await sonarrService.getProfiles()
        const rootFolders = await sonarrService.getRootFolders()
        const languageProfiles = await sonarrService.getLanguageProfiles()
        
        if (!profiles.length || !rootFolders.length) {
            return { success: false, message: 'Sonarr configuration incomplete' }
        }

        // Check if series exists to reuse title/settings
        const lookup = await sonarrService.getSeriesByTvdbId(tvdbId)
        
        // Get all seasons already requested across ALL active requests to maintain monitoring
        const activeRequests = await prisma.mediaRequest.findMany({
            where: { 
                tmdbId: tvId.toString()
            }
        })
        
        const seasonsFromRequests = new Set<number>()
        seasonsFromRequests.add(seasonNumber)
        
        activeRequests.forEach((req: Record<string, unknown>) => {
            try {
                const metadata = req.metadata ? JSON.parse(req.metadata as string) : {}
                const seasons = (metadata as { seasons?: number[] }).seasons || []
                seasons.forEach((s: number) => seasonsFromRequests.add(s))
            } catch (e) {}
        })

        const allSeasons = Array.from(seasonsFromRequests)

        const result = await sonarrService.addSeries({
            tvdbid: tvdbId,
            title: title || lookup?.title || 'Unknown Series',
            qualityProfileId: profiles[0].id,
            rootFolderPath: rootFolders[0].path,
            languageProfileId: languageProfiles?.[0]?.id,
            seasons: allSeasons,
            seasonFolder: true,
            seriesType: 'standard',
            monitored: true,
            searchNow: true
        })
        
        // Invalidate internal memory cache for this media availability
        forget(`media_availability_tv_${tvId}`)
        
        // Update local DB to ensure it appears in "Mes demandes"
        try {
            const dbUser = await prisma.user.findFirst({ 
                where: { email: user?.email || '' } 
            })

            let externalId: string | undefined
            if (result.success && (result as { data?: { id?: number } }).data?.id) {
                externalId = String((result as { data?: { id?: number } }).data?.id)
            }

            // Check if this specific season is already requested to avoid duplicates
            const existingSeasonRequest = await prisma.mediaRequest.findFirst({
                where: {
                    tmdbId: tvId.toString(),
                    mediaType: 'tv',
                    metadata: {
                        contains: `"seasons":[${seasonNumber}]`
                    }
                }
            })

            if (existingSeasonRequest) {
                log(`[Request Season] Season ${seasonNumber} already requested, skipping duplicate entry creation`)
                return result
            }

            // ALWAYS create a new request instead of merging
            const newRequest = await prisma.mediaRequest.create({
                data: {
                    externalId: externalId || `pending_${tvId}_${Date.now()}`,
                    tmdbId: tvId.toString(),
                    mediaType: 'tv',
                    title: title || lookup?.title || 'Sans titre',
                    status: 3, // PROCESSING
                    userId: dbUser?.id,
                    requesterName: user?.name || dbUser?.name,
                    requesterEmail: user?.email,
                    metadata: JSON.stringify({
                        posterPath: lookup?.remotePoster || lookup?.images?.[0]?.url,
                        seasons: [seasonNumber]
                    }),
                    requestedAt: new Date()
                }
            })

            const { logAction } = await import('@/lib/audit')
            await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', String(newRequest.id), { tmdbId: tvId, mediaType: 'tv', title, season: seasonNumber })
        } catch (dbError) {
            error('[Request Season] Failed to update local DB:', dbError)
        }
        
        // Invalidate Next.js cache
        revalidatePath(`/dashboard/media/${tvId}`)
        revalidatePath('/dashboard/requests/list')

        // Notifications V2 — émission directe (pas de webhook Sonarr)
        try {
            const { Notify } = await import('@/lib/notifications-v2')
            const dbUser = await prisma.user.findFirst({ where: { email: user?.email || '' } })
            let overview = ''
            let rating = ''
            let genres = ''
            let year = ''
            let posterPath: string | undefined
            try {
                const details = await tmdbService.getDetails(tvId, 'tv')
                if (details) {
                    overview = details.overview || ''
                    rating = details.vote_average?.toFixed(1) || ''
                    year = (details.first_air_date as string)?.substring(0, 4) || ''
                    if (details.genres) {
                        genres = details.genres.map((g: Record<string, unknown>) => g.name as string).join(', ')
                    }
                    if (details.poster_path) posterPath = details.poster_path
                }
            } catch (tmdbErr) {
                error('[Request Season] TMDB enrichment failed:', tmdbErr)
            }
            await Notify.mediaRequested(
                {
                    tmdbId: String(tvId),
                    mediaType: 'tv',
                    title: title || lookup?.title || 'Sans titre',
                    year,
                    overview,
                    posterPath,
                    genres,
                    rating,
                },
                dbUser ? {
                    id: dbUser.id,
                    name: dbUser.name ?? undefined,
                    email: dbUser.email ?? undefined,
                    whatsappNumber: (dbUser as Record<string, unknown>).whatsappNumber as string | undefined,
                } : undefined
            )
        } catch (v2Err) {
            error('[Request Season] NotificationsV2 emit failed:', v2Err)
        }

        return result
    } catch (e) {
        error('Error requesting season:', e)
        return { success: false, message: (e as Error).message || 'Erreur serveur' }
    }
}

export async function requestAllSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    try {
        const user = await getCurrentUser()
        const ability = defineAbilityFor(user)
        if (!ability.can('create', 'MediaRequest')) {
            return { success: false, message: 'Forbidden' }
        }

        const sonarrService = await getSonarrServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!sonarrService || !tmdbService) {
            return { success: false, message: 'Sonarr or TMDB not configured' }
        }

        // Get TVDB ID
        const externalIds = await tmdbService.getExternalIds('tv', tvId)
        if (!externalIds || !externalIds.tvdb_id) {
            return { success: false, message: 'Could not find TVDB ID' }
        }
        const tvdbId = externalIds.tvdb_id

        const profiles = await sonarrService.getProfiles()
        const rootFolders = await sonarrService.getRootFolders()
        const languageProfiles = await sonarrService.getLanguageProfiles()
        
        if (!profiles.length || !rootFolders.length) {
            return { success: false, message: 'Sonarr configuration incomplete' }
        }

        // Get all seasons already requested across ALL active requests to maintain monitoring
        const activeRequests = await prisma.mediaRequest.findMany({
            where: { 
                tmdbId: tvId.toString()
            }
        })
        
        const seasonsFromRequests = new Set<number>(seasonNumbers)
        
        activeRequests.forEach((req: Record<string, unknown>) => {
            try {
                const metadata = req.metadata ? JSON.parse(req.metadata as string) : {}
                const seasons = (metadata as { seasons?: number[] }).seasons || []
                seasons.forEach((s: number) => seasonsFromRequests.add(s))
            } catch (e) {}
        })

        const allSeasons = Array.from(seasonsFromRequests)

        const result = await sonarrService.addSeries({
            tvdbid: tvdbId,
            title: title || 'Unknown Series',
            qualityProfileId: profiles[0].id,
            rootFolderPath: rootFolders[0].path,
            languageProfileId: languageProfiles?.[0]?.id,
            seasons: allSeasons,
            seasonFolder: true,
            seriesType: 'standard',
            monitored: true,
            searchNow: true
        })
        
        // Invalidate internal memory cache for this media availability
        forget(`media_availability_tv_${tvId}`)
        
        // Update local DB to ensure it appears in "Mes demandes"
        try {
            const dbUser = await prisma.user.findFirst({ 
                where: { email: user?.email || '' } 
            })

            let externalId: string | undefined
            if (result.success && (result as { data?: { id?: number } }).data?.id) {
                externalId = String((result as { data?: { id?: number } }).data?.id)
            }

            // Get existing requested seasons
            const existingTvRequests = await prisma.mediaRequest.findMany({
                where: { tmdbId: tvId.toString(), mediaType: 'tv' },
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

            // Create separate requests for each new season
            for (const seasonNum of seasonNumbers) {
                if (alreadyRequestedSeasons.has(seasonNum)) {
                    log(`[Request All Seasons] Season ${seasonNum} already requested, skipping`)
                    continue
                }

                await prisma.mediaRequest.create({
                    data: {
                        externalId: externalId || `pending_${tvId}_${Date.now()}_s${seasonNum}`,
                        tmdbId: tvId.toString(),
                        mediaType: 'tv',
                        title: title || 'Sans titre',
                        status: 3, // PROCESSING
                        userId: dbUser?.id,
                        requesterName: user?.name || dbUser?.name,
                        requesterEmail: user?.email,
                        metadata: JSON.stringify({
                            seasons: [seasonNum]
                        }),
                        requestedAt: new Date()
                    }
                })

                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', `${tvId}_s${seasonNum}`, { tmdbId: tvId, mediaType: 'tv', title, season: seasonNum })
            }
        } catch (dbError) {
            error('[Request All Seasons] Failed to update local DB:', dbError)
        }
        
        // Invalidate Next.js cache
        revalidatePath(`/dashboard/media/${tvId}`)
        revalidatePath('/dashboard/requests/list')

        // Notifications V2
        try {
            const { Notify } = await import('@/lib/notifications-v2')
            const dbUser = await prisma.user.findFirst({ where: { email: user?.email || '' } })
            let overview = ''
            let rating = ''
            let genres = ''
            let year = ''
            let posterPath: string | undefined
            try {
                const details = await tmdbService.getDetails(tvId, 'tv')
                if (details) {
                    overview = details.overview || ''
                    rating = details.vote_average?.toFixed(1) || ''
                    year = (details.first_air_date as string)?.substring(0, 4) || ''
                    if (details.genres) {
                        genres = details.genres.map((g: Record<string, unknown>) => g.name as string).join(', ')
                    }
                    if (details.poster_path) posterPath = details.poster_path
                }
            } catch (tmdbErr) {
                error('[Request All Seasons] TMDB enrichment failed:', tmdbErr)
            }
            await Notify.mediaRequested(
                {
                    tmdbId: String(tvId),
                    mediaType: 'tv',
                    title: title || 'Sans titre',
                    year,
                    overview,
                    posterPath,
                    genres,
                    rating,
                },
                dbUser ? {
                    id: dbUser.id,
                    name: dbUser.name ?? undefined,
                    email: dbUser.email ?? undefined,
                    whatsappNumber: (dbUser as Record<string, unknown>).whatsappNumber as string | undefined,
                } : undefined
            )
        } catch (v2Err) {
            error('[Request All Seasons] NotificationsV2 emit failed:', v2Err)
        }

        return result
    } catch (e) {
        error('Error requesting all seasons:', e)
        return { success: false, message: (e as Error).message || 'Erreur serveur' }
    }
}
