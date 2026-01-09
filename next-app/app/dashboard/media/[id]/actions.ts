'use server'

import { getEmbyServiceForUser, getJellyseerrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { forget } from '@/lib/cache'
import { getSetting } from '@/lib/settings'

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  try {
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return null

    const tmdbData = await tmdbService.getSeasonDetails(tvId, seasonNumber)
    if (!tmdbData) return null

    // Fetch user info for filtering
    const user = await getCurrentUser()
    const instanceId = parseInt((user as any)?.instanceId || '0')
    const embyService = await getEmbyServiceForUser()

    let embyUserId: string | undefined = undefined
    if (user && user.email) {
        const dbUser = await (prisma as any).user.findFirst({ 
          where: { 
            email: user.email,
            instanceId
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
  } catch (error) {
    console.error('Error fetching season details:', error)
    return null
  }
}

export async function requestSeason(tvId: number, seasonNumber: number, title: string) {
    try {
        const user = await getCurrentUser()
        const instanceId = parseInt((user as any)?.instanceId || '0')
        const jellyseerrService = await getJellyseerrServiceForUser()
        
        if (!jellyseerrService) {
            return { success: false, message: 'Jellyseerr non configuré pour cette instance' }
        }

        // Auto-detect Jellyseerr User
        let jellyseerrUserId: string | undefined = undefined
        try {
            const jsUser = await jellyseerrService.findUserByEmailOrName(user?.email || undefined, user?.name || undefined)
            if (jsUser) {
                jellyseerrUserId = String(jsUser.id)
            }
        } catch (e) {
            console.warn('[Jellyseerr] Auto-mapping failed')
        }

        if (!jellyseerrUserId) {
            jellyseerrUserId = await getSetting('jellyseerr_user_id', instanceId)
        }
        
        const result = await jellyseerrService.requestMedia(tvId, 'tv', title, jellyseerrUserId || undefined, [seasonNumber])
        
        // Invalidate internal memory cache for this media availability
        forget(`jellyseerr_availability_tv_${tvId}`)
        
        // Invalidate Next.js cache
        revalidatePath(`/dashboard/media/${tvId}`)
        
        return result
    } catch (error) {
        console.error('Error requesting season:', error)
        return { success: false, message: 'Erreur serveur' }
    }
}
