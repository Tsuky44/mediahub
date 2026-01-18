'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection } from './downloads/file-actions'
import { getCurrentUser, getEmbyServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function getDashboardStats() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const embyService = await getEmbyServiceForUser()
    if (!embyService) return null

    // Get Library Stats
    const libraryStats = await embyService.getLibraryStats()

    // Get Disk Usage
    let diskUsage = { total: '0', used: '0', free: '0', percent: 0 }
    
    // Try Unraid first if configured
    const instanceId = parseInt((user as any).instanceId)
    const unraidUrl = await getSetting('unraid_url', instanceId)
    const unraidKey = await getSetting('unraid_api_key', instanceId)

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
        console.error('Failed to get Unraid storage stats:', e)
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
        console.error('Failed to get local disk usage:', e)
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
  } catch (e) {
    console.error('Failed to get dashboard stats:', e)
    return null
  }
}

export async function checkServicesHealth() {
  try {
    const user = await getCurrentUser()
    if (!user) return { emby: 'offline' }
    
    const instanceId = parseInt((user as any).instanceId)
    if (isNaN(instanceId)) return { emby: 'offline' }
    const embyUrl = await getSetting('emby_url', instanceId)
    const embyKey = await getSetting('emby_api_key', instanceId)

    // Test with short timeouts to avoid blocking the UI
    const embyRes = embyUrl && embyKey ? await testEmbyConnection(embyUrl, embyKey) : { success: false }

    return {
      emby: embyRes.success ? 'online' : 'offline'
    }
  } catch (e) {
    console.error('Failed to check services health:', e)
    return {
      emby: 'offline'
    }
  }
}

export async function liveSearch(query: string) {
  if (!query || query.length < 2) return []
  
  try {
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
    console.error('Live search failed:', e)
    return []
  }
}
