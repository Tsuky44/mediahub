'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection } from './downloads/file-actions'
import { getCurrentUser, getMediaServerServiceForUser, getMediaServerType, getTmdbServiceForUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { UnraidService } from '@/lib/services/unraid'
import { exec } from 'child_process'
import { promisify } from 'util'

import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { getTmdbService } from '@/lib/services/tmdb'
import { getReleaseWait } from '@/lib/services/media-status'
import { remember } from '@/lib/cache'
import { logger } from '@/lib/logger'

interface MediaRequestLite {
  id: number
  tmdbId?: string | null
  mediaType: string
  status: number
  metadata?: string | null
  title?: string | null
  requesterName?: string | null
  requesterEmail?: string | null
  userId?: number | null
}

interface TmdbSearchItem {
  media_type?: string
  id?: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string
}

export async function getRecentRequests() {
  const user = await getCurrentUser()
  const ability = defineAbilityFor(user)
  
  if (ability.cannot('read', 'MediaRequest')) {
    return []
  }

  const requestsRes = await db.query.mediaRequests.findMany({
    orderBy: [desc(mediaRequests.requestedAt)],
    limit: 20
  })

  const tmdbService = await getTmdbService()

  return await Promise.all((requestsRes as MediaRequestLite[]).map(async (req) => {
    let metadata: Record<string, unknown> = {}
    try {
      metadata = req.metadata ? JSON.parse(req.metadata) : {}
    } catch (e) {}

    let posterPath = metadata.posterPath as string | undefined
    
    const status = req.status

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

    // Pas encore disponible : le média est-il simplement en attente de sa sortie ?
    const tmdbIdNum = parseInt(String(req.tmdbId))
    const releaseWait = status < 4 && !isNaN(tmdbIdNum) && (req.mediaType === 'movie' || req.mediaType === 'tv')
      ? await getReleaseWait(tmdbIdNum, req.mediaType)
      : { awaitingRelease: false }

    return {
      id: req.id.toString(),
      type: req.mediaType,
      status: status,
      ...releaseWait,
      media: {
        title: req.title,
        posterPath: posterPath,
        tmdbId: req.tmdbId,
        seasons: (metadata.seasons as number[] | undefined) ?? undefined,
      },
      requestedBy: {
        displayName: req.requesterName || 'Inconnu',
        email: req.requesterEmail || '',
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
    const mediaService = await getMediaServerServiceForUser()
    if (!mediaService) return null

    // Get Library Stats
    const libraryStats = await mediaService.getLibraryStats()

    // Get Disk Usage
    let diskUsage = { total: '0', used: '0', free: '0', percent: 0 }
    
    // Try Unraid first if configured
    const [unraidUrl, unraidKey] = await Promise.all([
      getSetting('unraid_url'),
      getSetting('unraid_api_key'),
    ])

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
        logger.error('Failed to get Unraid storage stats:', e)
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
        logger.error('Failed to get local disk usage:', e)
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
    logger.error('Failed to get dashboard stats:', e)
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
      const mediaService = await getMediaServerServiceForUser()
      const serverType = await getMediaServerType()

      const isOnline = mediaService ? true : false

      return {
        emby: isOnline ? 'online' : 'offline',
        serverType: serverType || undefined,
      }
    })
  } catch (e) {
    logger.error('Failed to check services health:', e)
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
      .filter((item: TmdbSearchItem) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 8)
      .map((item: TmdbSearchItem) => ({
        id: item.id,
        title: item.title || item.name,
        type: item.media_type,
        year: (item.release_date || item.first_air_date || '').split('-')[0],
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null
      }))
  } catch (e) {
    logger.error('Live search failed:', e)
    return []
  }
}
