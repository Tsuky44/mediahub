import axios from 'axios'
import https from 'https'
import { getSetting } from '@/lib/settings'

export interface WatchHistoryItem {
  id: string
  UserId: string
  UserName: string
  ItemId: string
  ItemName: string
  ItemType: string
  PlaybackMethod: string
  ClientName: string
  DeviceName: string
  PlayDuration: number
  DateCreated: string
  ActivityDateInserted?: string
  PlaybackDuration?: number
  NowPlayingItemId?: string
  NowPlayingItemName?: string
  SeriesId?: string
  SeriesName?: string
  Client?: string
  NowPlaying: boolean
  Source?: string
}

export interface LibraryStats {
  LibraryName: string
  TotalItems: number
  TotalPlayed: number
  TotalWatchTime: number
}

export interface MostViewedItem {
  Id: string
  Name: string
  Type: string
  ViewCount: number
  TotalWatchTime: number
  PrimaryImageHash?: string
}

export interface UserStat {
  UserId: string
  Name: string
  PlayCount: number
}

export class JellystatService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  constructor(config?: { url: string, apiKey: string }) {
    if (config) {
      this.baseUrl = config.url.replace(/\/$/, '')
      this.apiKey = config.apiKey
    }
  }

  private async init(instanceId?: number) {
    if (this.baseUrl && this.apiKey) return true

    if (!instanceId) return false

    const url = await getSetting('jellystat_url', instanceId)
    const key = await getSetting('jellystat_api_key', instanceId)

    if (url) this.baseUrl = url.replace(/\/$/, '')
    if (key) this.apiKey = key

    if (!this.baseUrl || !this.apiKey) {
      console.warn('[JellystatService] Not configured in DB')
      return false
    }
    return true
  }

  private async getClient(instanceId?: number) {
    await this.init(instanceId)
    if (!this.baseUrl || !this.apiKey) return null

    return axios.create({
      timeout: 5000, // 5s timeout
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  }

  private async get(endpoint: string, params: any = {}, instanceId?: number) {
    const client = await this.getClient(instanceId)
    if (!client || !this.baseUrl) return null

    const fullUrl = `${this.baseUrl}${endpoint}`
    const apiKey = this.apiKey!
    
    console.log(`[JellystatService] GET Fetching: ${fullUrl}`)
    
    const authHeaders = {
      'x-api-token': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }

    try {
      const response = await client.get(fullUrl, { 
        params,
        headers: authHeaders
      })
      return response.data
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        try {
          const response = await client.get(fullUrl, {
            params: { ...params, apiKey: apiKey }
          })
          return response.data
        } catch (e2: any) {
          console.error(`[JellystatService] Auth failed for ${endpoint}. Status: ${e2.response?.status}`)
          return null
        }
      }
      console.error(`[JellystatService] Error fetching ${endpoint}: ${error.message}`)
      return null
    }
  }

  private async post(endpoint: string, body: any = {}, instanceId?: number) {
    const client = await this.getClient(instanceId)
    if (!client || !this.baseUrl) return null

    const fullUrl = `${this.baseUrl}${endpoint}`
    const apiKey = this.apiKey!

    console.log(`[JellystatService] POST Posting to: ${fullUrl}`)

    const authHeaders = {
      'x-api-token': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }

    try {
      const response = await client.post(fullUrl, body, { 
        headers: authHeaders
      })
      return response.data
    } catch (error: any) {
      console.error(`[JellystatService] Error posting to ${endpoint}: ${error.message}`)
      return null
    }
  }

  async getHistory(limit = 200, offset = 0, days = 30, instanceId?: number) {
    const page = Math.floor(offset / limit) + 1
    const data = await this.get('/stats/getPlaybackActivity', { size: limit, page: page, days: days }, instanceId)
    return data?.results || []
  }

  async getMostViewed(limit = 10, days = 30, instanceId?: number): Promise<MostViewedItem[]> {
    const [movies, series] = await Promise.all([
        this.post('/stats/getMostViewedByType', { days: days, type: 'Movie' }, instanceId),
        this.post('/stats/getMostViewedByType', { days: days, type: 'Series' }, instanceId)
    ])
    
    const mapItem = (item: any, type: string): MostViewedItem => ({
        Id: item.Id,
        Name: item.Name,
        Type: type,
        ViewCount: parseInt(item.Plays || '0'),
        TotalWatchTime: parseFloat(item.total_playback_duration || '0'),
        PrimaryImageHash: item.PrimaryImageHash
    })

    const all = [
        ...(Array.isArray(movies) ? movies : []).map((i: any) => mapItem(i, 'Movie')),
        ...(Array.isArray(series) ? series : []).map((i: any) => mapItem(i, 'Series'))
    ]
    
    return all.sort((a, b) => b.ViewCount - a.ViewCount).slice(0, limit)
  }

  async getUserStats(days = 30, instanceId?: number): Promise<UserStat[]> {
    const data = await this.post('/stats/getMostActiveUsers', { days: days }, instanceId)
    if (!Array.isArray(data)) return []
    
    return data.map((u: any) => ({
      UserId: u.UserId,
      Name: u.Name || u.UserName,
      PlayCount: parseInt(u.Plays || u.count || '0')
    }))
  }

  async getLibraryStats(instanceId?: number) {
    return this.get('/stats/getLibraryOverview', {}, instanceId)
  }

  async getItemImageUrl(itemId: string) {
    await this.init()
    if (!this.baseUrl) return null
    return `${this.baseUrl}/proxy/Items/Images/Primary?id=${itemId}`
  }

  async getViewsByLibraryType(days = 30) {
    const data = await this.get('/stats/getViewsByLibraryType', { days: days })
    
    // Transform object response {"Movie": 10, "Episode": 5, ...} to array
    // Also map "Episode" to "Series" for better UX
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const mapped: Record<string, number> = {}
      
      Object.entries(data).forEach(([key, value]) => {
        let type = key
        if (type === 'Episode') type = 'Series'
        
        mapped[type] = (mapped[type] || 0) + (value as number)
      })

      return Object.entries(mapped).map(([key, value]) => ({
        LibraryType: key,
        ViewCount: value
      }))
    }
    
    return Array.isArray(data) ? data : []
  }

  async getWatchStats(days = 30) {
    const data = await this.get('/stats/getViewsOverTime', { days: days })
    return data?.stats || []
  }

  async testConnection() {
    try {
      const client = await this.getClient()
      if (!client || !this.baseUrl) return { success: false, error: 'Configuration manquante (URL ou API Key)' }

      // Utilisation d'un endpoint plus standard sans le préfixe /api qui peut varier
      const fullUrl = `${this.baseUrl}/stats/getPlaybackActivity`
      const apiKey = this.apiKey!
      
      console.log(`[JellystatService] Testing connection to: ${fullUrl}`)
      
      const authHeaders = {
        'x-api-token': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }

      try {
        const response = await client.get(fullUrl, { 
          params: { size: 1, page: 1 },
          headers: authHeaders 
        })
        // Si on reçoit une réponse (même vide ou avec des résultats), c'est que la connexion est établie
        if (response.status === 200) {
             return { success: true }
        }
        return { success: false, error: `Erreur HTTP ${response.status}` }
      } catch (e: any) {
        console.error('Jellystat connection test failed:', e.message)
        if (e.response) {
            return { success: false, error: `Erreur HTTP ${e.response.status}: ${e.response.statusText}` }
        }
        return { success: false, error: e.message || 'Erreur de connexion' }
      }
    } catch (e: any) {
      console.error('Jellystat connection test unexpected error:', e)
      return { success: false, error: e.message }
    }
  }

  async getServiceUrl() {
    await this.init()
    return this.baseUrl
  }
}
