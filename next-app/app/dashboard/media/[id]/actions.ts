'use server'

import { getEmbyServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users, mediaRequests } from '@/lib/db/schema'
import { eq, and, like } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { forget } from '@/lib/cache'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'
import { logger } from '@/lib/logger'


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
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        if (dbUser && dbUser.embyUserId) {
            embyUserId = dbUser.embyUserId
        }
    }

    // Fetch Emby data to check played status
    let embyEpisodes: { IndexNumber?: number; UserData?: { Played?: boolean; PlayedPercentage?: number } }[] = []
    if (embyUserId && embyService) {
         const embySeries = await embyService.getItemByTmdbId(embyUserId, tvId, 'Series')
         if (embySeries) {
             embyEpisodes = await embyService.getEpisodes(embyUserId, embySeries.Id, seasonNumber)
         }
    }

    // Merge everything into TMDB episodes
    if (tmdbData.episodes) {
        tmdbData.episodes = tmdbData.episodes.map((ep: { episode_number?: number; [key: string]: unknown }) => {
            const embyEp = embyEpisodes.find((e: { IndexNumber?: number }) => e.IndexNumber === ep.episode_number)
            
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
    logger.error('Error fetching season details:', e)
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
        const activeRequests = await db.select().from(mediaRequests).where(eq(mediaRequests.tmdbId, tvId.toString()))
        
        const seasonsFromRequests = new Set<number>()
        seasonsFromRequests.add(seasonNumber)
        
        activeRequests.forEach((req: { metadata?: string | null }) => {
            try {
                const metadata = req.metadata ? JSON.parse(req.metadata) as { seasons?: number[] } : {}
                const seasons = metadata.seasons || []
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
            const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || '')).limit(1)

            let externalId: string | undefined
            const resultSeries = (result as { series?: { id?: number } }).series
            if (result.success && resultSeries?.id) {
                externalId = resultSeries.id.toString()
            }

            // Check if this specific season is already requested to avoid duplicates
            const existingSeasonRequest = await db.select().from(mediaRequests).where(
                and(
                    eq(mediaRequests.tmdbId, tvId.toString()),
                    eq(mediaRequests.mediaType, 'tv'),
                    like(mediaRequests.metadata || '', `%"seasons":[${seasonNumber}]%`)
                )
            ).limit(1)

            if (existingSeasonRequest.length > 0) {
                logger.info(`[Request Season] Season ${seasonNumber} already requested, skipping duplicate entry creation`)
                return result
            }

            // ALWAYS create a new request instead of merging
            const [newRequest] = await db.insert(mediaRequests).values({
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
            }).returning()

            const { logAction } = await import('@/lib/audit')
            await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id.toString(), { tmdbId: tvId, mediaType: 'tv', title, season: seasonNumber })

            // Notify V2 — MEDIA_REQUESTED
            try {
                const { Notify } = await import('@/lib/notifications-v2')
                const details = await tmdbService.getDetails(tvId, 'tv')
                await Notify.mediaRequested(
                    {
                        tmdbId: String(tvId),
                        mediaType: 'tv',
                        title: title || lookup?.title || 'Sans titre',
                        year: details?.first_air_date?.substring(0, 4) || undefined,
                        overview: details?.overview || undefined,
                        posterPath: lookup?.remotePoster || details?.poster_path || undefined,
                        genres: details?.genres?.map((g: { name: string }) => g.name).join(', ') || undefined,
                        seasonNumber,
                    },
                    dbUser ? {
                        id: dbUser.id,
                        name: dbUser.name ?? undefined,
                        email: dbUser.email ?? undefined,
                        whatsappNumber: (dbUser as any).whatsappNumber ?? undefined,
                    } : undefined
                )
            } catch (notifError) {
                logger.error('[Request Season] Failed to dispatch Notify V2 MEDIA_REQUESTED:', notifError)
            }
        } catch (dbError) {
            logger.error('[Request Season] Failed to update local DB:', dbError)
        }
        
        // Invalidate Next.js cache
        revalidatePath(`/dashboard/media/${tvId}`)
        revalidatePath('/dashboard/requests/list')
        
        return result
    } catch (e) {
        logger.error('Error requesting season:', e)
        return { success: false, message: (e as Error).message || 'Erreur serveur' }
    }
}

export async function requestSelectedSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    if (seasonNumbers.length === 0) {
        return { success: false, message: 'No seasons selected' }
    }
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

        const activeRequests = await db.select().from(mediaRequests).where(eq(mediaRequests.tmdbId, tvId.toString()))
        
        const seasonsToMonitor = new Set<number>(seasonNumbers)
        
        activeRequests.forEach((req: { metadata?: string | null }) => {
            try {
                const metadata = req.metadata ? JSON.parse(req.metadata) as { seasons?: number[] } : {}
                const seasons = metadata.seasons || []
                seasons.forEach((s: number) => seasonsToMonitor.add(s))
            } catch (e) {}
        })

        const allSeasons = Array.from(seasonsToMonitor)

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
        
        forget(`media_availability_tv_${tvId}`)
        
        try {
            const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || '')).limit(1)

            let externalId: string | undefined
            const resultSeries = (result as { series?: { id?: number; remotePoster?: string; images?: { url?: string }[] } }).series
            if (result.success && resultSeries?.id) {
                externalId = resultSeries.id.toString()
            }

            const createdSeasons: number[] = []

            for (const seasonNumber of seasonNumbers) {
                const existingSeasonRequest = await db.select().from(mediaRequests).where(
                    and(
                        eq(mediaRequests.tmdbId, tvId.toString()),
                        eq(mediaRequests.mediaType, 'tv'),
                        like(mediaRequests.metadata || '', `%"seasons":[${seasonNumber}]%`)
                    )
                ).limit(1)

                if (existingSeasonRequest.length > 0) {
                    logger.info(`[Request Selected] Season ${seasonNumber} already requested, skipping duplicate entry creation`)
                    continue
                }

                const [newRequest] = await db.insert(mediaRequests).values({
                    externalId: externalId || `pending_${tvId}_${Date.now()}`,
                    tmdbId: tvId.toString(),
                    mediaType: 'tv',
                    title: title || 'Sans titre',
                    status: 3,
                    userId: dbUser?.id,
                    requesterName: user?.name || dbUser?.name,
                    requesterEmail: user?.email,
                    metadata: JSON.stringify({
                        posterPath: resultSeries?.remotePoster || resultSeries?.images?.[0]?.url,
                        seasons: [seasonNumber]
                    }),
                    requestedAt: new Date()
                }).returning()

                createdSeasons.push(seasonNumber)

                const { logAction } = await import('@/lib/audit')
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id.toString(), { tmdbId: tvId, mediaType: 'tv', title, season: seasonNumber })
            }

            // Notify V2 — MEDIA_REQUESTED (une seule fois, groupée par saisons)
            if (createdSeasons.length > 0) {
                try {
                    const { Notify } = await import('@/lib/notifications-v2')
                    const { formatSeasonList } = await import('@/lib/notifications-v2/utils/season-formatter')
                    const details = await tmdbService.getDetails(tvId, 'tv')
                    const seasonLabel =
                        createdSeasons.length === 1
                            ? `Saison ${createdSeasons[0]}`
                            : formatSeasonList(createdSeasons)
                    const displayTitle = `${title || 'Sans titre'} — ${seasonLabel}`

                    await Notify.mediaRequested(
                        {
                            tmdbId: String(tvId),
                            mediaType: 'tv',
                            title: displayTitle,
                            year: details?.first_air_date?.substring(0, 4) || undefined,
                            overview: details?.overview || undefined,
                            posterPath: resultSeries?.remotePoster || details?.poster_path || undefined,
                            genres: details?.genres?.map((g: { name: string }) => g.name).join(', ') || undefined,
                            seasonNumber: createdSeasons.length === 1 ? createdSeasons[0] : undefined,
                            seasons: createdSeasons.length > 1 ? createdSeasons : undefined,
                        },
                        dbUser ? {
                            id: dbUser.id,
                            name: dbUser.name ?? undefined,
                            email: dbUser.email ?? undefined,
                            whatsappNumber: (dbUser as any).whatsappNumber ?? undefined,
                        } : undefined
                    )
                } catch (notifError) {
                    logger.error('[Request Selected] Failed to dispatch Notify V2 MEDIA_REQUESTED:', notifError)
                }
            }
        } catch (dbError) {
            logger.error('[Request Selected] Failed to update local DB:', dbError)
        }
        
        revalidatePath(`/dashboard/media/${tvId}`)
        revalidatePath('/dashboard/requests/list')
        
        return result
    } catch (e) {
        logger.error('Error requesting selected seasons:', e)
        return { success: false, message: (e as Error).message || 'Erreur serveur' }
    }
}

export async function requestAllSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    return requestSelectedSeasons(tvId, title, seasonNumbers)
}
