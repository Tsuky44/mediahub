'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection } from './downloads/file-actions'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'

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
