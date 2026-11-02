'use server'

import { getMediaServerServiceForUser, getMediaServerUserId, getTmdbServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createMediaRequest } from '@/lib/services/media-requests'
import { logger } from '@/lib/logger'


export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  try {
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return null

    const tmdbData = await tmdbService.getSeasonDetails(tvId, seasonNumber)
    if (!tmdbData) return null

    // Fetch user info for filtering
    const user = await getCurrentUser()
    const mediaService = await getMediaServerServiceForUser()

    let embyUserId: string | undefined = undefined
    if (user && user.email) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        const mediaUserId = getMediaServerUserId(dbUser)
        if (mediaUserId) {
            embyUserId = mediaUserId
        }
    }

    // Fetch Emby data to check played status
    let embyEpisodes: { IndexNumber?: number; UserData?: { Played?: boolean; PlayedPercentage?: number } }[] = []
    if (embyUserId && mediaService) {
         const embySeries = await mediaService.getItemByTmdbId(embyUserId, tvId, 'Series')
         if (embySeries) {
             embyEpisodes = await mediaService.getEpisodes(embyUserId, embySeries.Id, seasonNumber)
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

async function requestSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, message: 'Unauthorized' }

        // Passe par le gestionnaire choisi dans les parametres (Radarr/Sonarr ou sorraa)
        const result = await createMediaRequest(user as Parameters<typeof createMediaRequest>[0], {
            tmdbId: tvId,
            mediaType: 'tv',
            title,
            seasons: seasonNumbers,
        })
        if (result.status !== 200) {
            const error = (result.body as { error?: string } | null)?.error
            return { success: false, message: error || 'Erreur serveur' }
        }
        return { success: true, message: (result.body as { message?: string } | null)?.message }
    } catch (e) {
        logger.error('Error requesting seasons:', e)
        return { success: false, message: (e as Error).message || 'Erreur serveur' }
    }
}

export async function requestSeason(tvId: number, seasonNumber: number, title: string) {
    return requestSeasons(tvId, title, [seasonNumber])
}

export async function requestSelectedSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    if (seasonNumbers.length === 0) {
        return { success: false, message: 'No seasons selected' }
    }
    return requestSeasons(tvId, title, seasonNumbers)
}

export async function requestAllSeasons(tvId: number, title: string, seasonNumbers: number[]) {
    return requestSelectedSeasons(tvId, title, seasonNumbers)
}
