'use server'

import { getEmbyServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { forget } from '@/lib/cache'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


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
        const dbUser = await (prisma as any).user.findFirst({ 
          where: { 
            email: user.email
          } 
        })
        if (dbUser && dbUser.embyUserId) {
            embyUserId = dbUser.embyUserId
        }
    }

    // Fetch Emby data to check played status
    let embyEpisodes: any[] = []
    if (embyUserId && embyService) {
         const embySeries = await embyService.getItemByTmdbId(embyUserId, tvId, 'Series')
         if (embySeries) {
             embyEpisodes = await embyService.getEpisodes(embyUserId, embySeries.Id, seasonNumber)
         }
    }

    // Merge everything into TMDB episodes
    if (tmdbData.episodes) {
        tmdbData.episodes = tmdbData.episodes.map((ep: any) => {
            const embyEp = embyEpisodes.find((e: any) => e.IndexNumber === ep.episode_number)
            
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
        const activeRequests = await (prisma as any).mediaRequest.findMany({
            where: { 
                tmdbId: tvId.toString()
            }
        })
        
        const seasonsFromRequests = new Set<number>()
        seasonsFromRequests.add(seasonNumber)
        
        activeRequests.forEach((req: any) => {
            try {
                const metadata = req.metadata ? JSON.parse(req.metadata) : {}
                const seasons = (metadata as any).seasons || []
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
            const dbUser = await (prisma as any).user.findFirst({ 
                where: { email: user?.email || '' } 
            })

            let externalId: string | undefined
            if (result.success && (result as any).series?.id) {
                externalId = (result as any).series.id.toString()
            }

            // Check if this specific season is already requested to avoid duplicates
            const existingSeasonRequest = await (prisma as any).mediaRequest.findFirst({
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
            await (prisma as any).mediaRequest.create({
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
        } catch (dbError) {
            error('[Request Season] Failed to update local DB:', dbError)
        }
        
        // Invalidate Next.js cache
        revalidatePath(`/dashboard/media/${tvId}`)
        revalidatePath('/dashboard/requests/list')
        
        return result
    } catch (e: any) {
        error('Error requesting season:', e)
        return { success: false, message: e.message || 'Erreur serveur' }
    }
}
