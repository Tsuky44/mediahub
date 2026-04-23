'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection } from './downloads/file-actions'
import { getCurrentUser, getEmbyServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { UnraidService } from '@/lib/services/unraid'
import { exec } from 'child_process'
import { promisify } from 'util'

import { prisma } from '@/lib/prisma'
import { getTmdbService } from '@/lib/services/tmdb'
import { getMediaAvailability } from '@/lib/services/media-status'
import { remember } from '@/lib/cache'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function getRecentRequests() {
  const user = await getCurrentUser()
  const ability = defineAbilityFor(user)
  
  if (ability.cannot('read', 'MediaRequest')) {
    return []
  }

  const requestsRes = await prisma.mediaRequest.findMany({
    orderBy: { requestedAt: 'desc' },
    take: 20
  })

  const tmdbService = await getTmdbService()

  return await Promise.all(requestsRes.map(async (req: any) => {
    let metadata: any = {}
    try {
      metadata = req.metadata ? JSON.parse(req.metadata) : {}
    } catch (e) {}

    let posterPath = metadata.posterPath
    
    // Check availability if not already marked as available
    let status = req.status
    if (status !== 5 && req.tmdbId) {
       try {
         const availability = await getMediaAvailability(parseInt(req.tmdbId), req.mediaType as 'movie' | 'tv')
         
         // log(`[Dashboard] Checking status for ${req.title} (${req.tmdbId}):`, availability)

         let newStatus = status
         if (availability.status === 'available') {
            newStatus = 5
         } else if (availability.status === 'partial') {
            newStatus = 4
         } else if (availability.status === 'pending' && status !== 3) {
            // If it's pending in Sonarr/Radarr, make sure we aren't overwriting a 'processing' status (3)
            // unless we want to revert to pending. But usually 3 is set by manual approval or something.
            // If it is 2 (approved), we might want to keep it 2 until it starts downloading.
            // But 'pending' in MediaAvailability means 'monitored but no files'.
            // Let's stick to upgrading to 3 or 5.
         }

         // Update DB if status changed
         if (newStatus !== status) {
            log(`[Dashboard] Updating status for ${req.title} (${req.tmdbId}) from ${status} to ${newStatus}`)
            await prisma.mediaRequest.update({
                where: { id: req.id },
                data: { status: newStatus }
            })
            // Send media_available notification when media first becomes available
            if (newStatus === 5) {
                try {
                    const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
                    await ExternalNotificationService.send('media_available', {
                        title: req.title,
                        message: `${req.title} est maintenant disponible sur le serveur.`,
                        data: {
                            tmdbId: req.tmdbId,
                            mediaType: req.mediaType,
                            title: req.title,
                            year: metadata.year || '',
                            overview: metadata.overview || '',
                            posterPath: posterPath || metadata.posterPath || '',
                            genres: metadata.genres || '',
                            user: req.requesterName || ''
                        }
                    }, req.userId ?? undefined)
                } catch (notifErr) {
                    error(`[Dashboard] Failed to send media_available notification for ${req.title}:`, notifErr)
                }
            }
            status = newStatus
         }
       } catch (e) {
         error(`[Dashboard] Error checking status for ${req.title}:`, e)
       }
    }

    // Patch 11: Cache TMDB poster 5min pour éviter N appels non cachés au chargement
    if ((!posterPath || posterPath.includes('MediaCover')) && req.tmdbId && tmdbService) {
      try {
         const tmdbIdNum = parseInt(req.tmdbId)
         if (!isNaN(tmdbIdNum)) {
           const details = await remember(
             `tmdb_poster_${req.mediaType}_${tmdbIdNum}`,
             5 * 60 * 1000,
             () => tmdbService!.getDetails(tmdbIdNum, req.mediaType as 'movie' | 'tv')
           )
           if (details && details.poster_path) {
             posterPath = details.poster_path
           }
         }
      } catch (e) {
         // ignore error
      }
    }

    return {
      id: req.id.toString(),
      type: req.mediaType,
      status: status,
      media: {
        title: req.title,
        posterPath: posterPath,
        tmdbId: req.tmdbId
      },
      requestedBy: {
        displayName: req.requesterName || 'Inconnu'
      }
    }
  }))
}

const execPromise = promisify(exec)

export async function getDashboardStats() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const ability = defineAbilityFor(user)
    if (ability.cannot('read', 'DashboardStats')) {
      return null
    }

    // Patch 9: Cache serveur 30s — évite d'appeler Emby + Unraid à chaque client
    return await remember('dashboard_stats', 30 * 1000, async () => {
    const embyService = await getEmbyServiceForUser()
    if (!embyService) return null

    // Get Library Stats
    const libraryStats = await embyService.getLibraryStats()

    // Get Disk Usage
    let diskUsage = { total: '0', used: '0', free: '0', percent: 0 }
    
    // Try Unraid first if configured
    const unraidUrl = await getSetting('unraid_url')
    const unraidKey = await getSetting('unraid_api_key')

    if (unraidUrl && unraidKey) {
      try {
        const unraidService = new UnraidService(unraidUrl, unraidKey)
        const stats = await unraidService.getStorageStats()
        if (stats) {
          diskUsage = {
            total: stats.total,
            used: stats.used,
            free: stats.free,
            percent: stats.percent
          }
        }
      } catch (e) {
        error('Failed to get Unraid storage stats:', e)
      }
    }

    // Fallback to local disk usage if Unraid failed or not configured
    if (diskUsage.total === '0') {
      try {
        const { stdout } = await execPromise('df -h / | tail -1')
        const parts = stdout.trim().split(/\s+/)
        if (parts.length >= 5) {
          diskUsage = {
            total: parts[1],
            used: parts[2],
            free: parts[3],
            percent: parseInt(parts[4].replace('%', ''))
          }
        }
      } catch (e) {
        error('Failed to get local disk usage:', e)
      }
    }

    return {
      library: {
        movies: libraryStats?.MovieCount || 0,
        series: libraryStats?.SeriesCount || 0,
        episodes: libraryStats?.EpisodeCount || 0
      },
      disk: diskUsage
    }
    }) // end remember
  } catch (e) {
    error('Failed to get dashboard stats:', e)
    return null
  }
}

export async function checkServicesHealth() {
  try {
    const user = await getCurrentUser()
    if (!user) return { emby: 'offline' }

    const ability = defineAbilityFor(user)
    if (ability.cannot('read', 'DashboardStats')) {
      return { emby: 'hidden' } // Or offline
    }

    // Patch 10: Cache serveur 20s — évite un appel HTTP Emby toutes les 30s par client connecté
    return await remember('services_health', 20 * 1000, async () => {
      const embyUrl = await getSetting('emby_url')
      const embyKey = await getSetting('emby_api_key')

      const embyRes = embyUrl && embyKey ? await testEmbyConnection(embyUrl, embyKey) : { success: false }

      return {
        emby: embyRes.success ? 'online' : 'offline'
      }
    })
  } catch (e) {
    error('Failed to check services health:', e)
    return {
      emby: 'offline'
    }
  }
}

export async function liveSearch(query: string) {
  if (!query || query.length < 2) return []
  
  try {
    const user = await getCurrentUser()
    if (!user) return []

    const ability = defineAbilityFor(user)
    if (ability.cannot('read', 'Media')) {
      return []
    }

    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return []

    const results = await tmdbService.searchMulti(query)
    const resultsArray = Array.isArray(results.results) ? results.results : []
    return resultsArray
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 8)
      .map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        type: item.media_type,
        year: (item.release_date || item.first_air_date || '').split('-')[0],
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null
      }))
  } catch (e) {
    error('Live search failed:', e)
    return []
  }
}
