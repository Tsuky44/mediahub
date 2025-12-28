'use server'

import { tmdbService } from '@/lib/services/tmdb'
import { jellyseerrService } from '@/lib/services/jellyseerr'
import { embyService } from '@/lib/services/emby'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  try {
    const tmdbData = await tmdbService.getSeasonDetails(tvId, seasonNumber)
    
    // Fetch Emby data to check played status
    const user = await getCurrentUser()
    if (user && user.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
        if (dbUser && dbUser.embyUserId) {
             // We need the Emby Series ID first. 
             // We can search for the series by TMDB ID.
             const embySeries = await embyService.getItemByTmdbId(dbUser.embyUserId, tvId, 'Series')
             
             if (embySeries) {
                 const embyEpisodes = await embyService.getEpisodes(dbUser.embyUserId, embySeries.Id, seasonNumber)
                 
                 // Merge Emby status into TMDB episodes
                 if (tmdbData.episodes) {
                     tmdbData.episodes = tmdbData.episodes.map((ep: any) => {
                         // Match by episode number
                         // Emby IndexNumber usually matches TMDB episode_number
                         const embyEp = embyEpisodes.find((e: any) => e.IndexNumber === ep.episode_number)
                         if (embyEp && embyEp.UserData) {
                             return {
                                 ...ep,
                                 userData: {
                                     played: embyEp.UserData.Played,
                                     playedPercentage: embyEp.UserData.PlayedPercentage
                                 }
                             }
                         }
                         return ep
                     })
                 }
             }
        }
    }

    return tmdbData
  } catch (error) {
    console.error('Error fetching season details:', error)
    return null
  }
}

import { revalidatePath } from 'next/cache'
import { forget } from '@/lib/cache'
import { getSetting } from '@/lib/settings'

export async function requestSeason(tvId: number, seasonNumber: number, title: string) {
    try {
        const user = await getCurrentUser()
        
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
            jellyseerrUserId = await getSetting('jellyseerr_user_id')
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
