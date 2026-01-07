'use server'

import { getSetting } from '@/lib/settings'
import { testEmbyConnection, testJellystatConnection } from './downloads/file-actions'
import { tmdbService } from '@/lib/services/tmdb'

export async function checkServicesHealth() {
  try {
    const embyUrl = await getSetting('emby_url')
    const embyKey = await getSetting('emby_api_key')
    const jsUrl = await getSetting('jellystat_url')
    const jsKey = await getSetting('jellystat_api_key')

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
