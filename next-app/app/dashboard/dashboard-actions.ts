'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection, testJellystatConnection } from './downloads/file-actions'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'

export async function checkServicesHealth() {
  try {
    const user = await getCurrentUser()
    if (!user) return { emby: 'offline', jellystat: 'offline' }
    
    const instanceId = parseInt((user as any).instanceId)
    if (isNaN(instanceId)) return { emby: 'offline', jellystat: 'offline' }
    const embyUrl = await getSetting('emby_url', instanceId)
    const embyKey = await getSetting('emby_api_key', instanceId)
    const jsUrl = await getSetting('jellystat_url', instanceId)
    const jsKey = await getSetting('jellystat_api_key', instanceId)

    // Test with short timeouts to avoid blocking the UI
    const [embyRes, jsRes] = await Promise.all([
      embyUrl && embyKey ? testEmbyConnection(embyUrl, embyKey) : Promise.resolve({ success: false }),
      jsUrl && jsKey ? testJellystatConnection(jsUrl, jsKey) : Promise.resolve({ success: false })
    ])

    return {
      emby: embyRes.success ? 'online' : 'offline',
      jellystat: jsRes.success ? 'online' : 'offline'
    }
  } catch (e) {
    console.error('Failed to check services health:', e)
    return {
      emby: 'offline',
      jellystat: 'offline'
    }
  }
}

export async function liveSearch(query: string) {
  if (!query || query.length < 2) return []
  
  try {
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return []

    const results = await tmdbService.searchMulti(query)
    return (results.results || [])
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
