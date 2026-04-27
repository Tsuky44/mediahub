import axios from 'axios'
import { getSetting } from '../settings'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

export interface IndexerField {
  name: string
  value?: string | number | boolean
}

export async function getProwlarrService() {
  const url = await getSetting('prowlarr_url')
  const apiKey = await getSetting('prowlarr_api_key')
  
  if (!url || !apiKey) return null
  return new ProwlarrService(url, apiKey)
}

export interface ProwlarrIndexer {
  id: number
  name: string
  fields: IndexerField[]
  implementation: string
  implementationName: string
  infoLink: string
  configContract: string
  protocol: string
  added: string
  tags: number[]
  enable: boolean
}

export interface ProwlarrSearchResult {
  guid: string
  age: number
  size: number
  indexerId: number
  indexer: string
  title: string
  sortTitle: string
  imdbId?: string
  tmdbId?: number
  tvdbId?: number
  magnetUrl?: string
  downloadUrl?: string
  infoUrl?: string
  seeders?: number
  leechers?: number
  protocol: string
  indexerFlags: string[]
  publishDate: string
}

export class ProwlarrService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private getClient() {
    return axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      headers: {
        'X-Api-Key': this.apiKey
      },
      timeout: 20000 // Search might take longer
    })
  }

  async getIndexers() {
    const client = this.getClient()
    try {
      const response = await client.get('/indexer')
      return response.data as ProwlarrIndexer[]
    } catch (e: any) {
      error('[Prowlarr] Failed to fetch indexers:', e.message)
      return []
    }
  }

  /**
   * Get indexer stats from Prowlarr
   * Note: These are search/grab stats, NOT user account stats (ratio, upload, download)
   */
  async getIndexerStats() {
    const client = this.getClient()
    try {
      const response = await client.get('/indexerstats')
      log('[Prowlarr] IndexerStats response:', JSON.stringify(response.data).substring(0, 500))
      return response.data
    } catch (e: any) {
      error('[Prowlarr] Failed to fetch indexer stats:', e.message)
      return null
    }
  }

  async getIndexerDetails(indexerId: number) {
    const client = this.getClient()
    try {
      const response = await client.get(`/indexer/${indexerId}`)
      return response.data as ProwlarrIndexer
    } catch (e: any) {
      error(`[Prowlarr] Failed to fetch indexer ${indexerId}:`, e.message)
      return null
    }
  }

  /**
   * Extract tracker configuration from Prowlarr indexer
   * This is useful for getting API keys and base URLs from private trackers
   */
  async getTrackerConfigFromIndexer(indexerId: number): Promise<{
    baseUrl?: string
    apiKey?: string
    passkey?: string
    username?: string
    password?: string
    type?: string
  } | null> {
    const details = await this.getIndexerDetails(indexerId)
    if (!details) return null

    const result: {
      baseUrl?: string
      apiKey?: string
      passkey?: string
      username?: string
      password?: string
      type?: string
      cookie?: string
    } = {
      type: details.implementation?.toLowerCase().includes('gazelle') ? 'gazelle' :
            details.implementation?.toLowerCase().includes('unit3d') ? 'unit3d' : 'custom'
    }

    // Extract fields
    if (details.fields && Array.isArray(details.fields)) {
      for (const field of details.fields) {
        const name = field.name?.toLowerCase() || ''
        const value = field.value

        if (!value) continue

        // Base URL
        if (name.includes('baseurl') || name.includes('base_url') || name === 'base') {
          result.baseUrl = String(value)
        }
        // API Key / Passkey
        else if (name.includes('apikey') || name.includes('api_key') || name === 'passkey' || name === 'pass') {
          result.apiKey = String(value)
          result.passkey = String(value)
        }
        // Username
        else if (name === 'username' || name === 'user') {
          result.username = String(value)
        }
        // Password
        else if (name === 'password' || name === 'pass') {
          result.password = String(value)
        }
        // Cookie (for some trackers)
        else if (name === 'cookie') {
          result.cookie = String(value)
        }
      }
    }

    // Try to get baseUrl from definition if not in fields
    if (!result.baseUrl && details.infoLink) {
      result.baseUrl = details.infoLink
    }

    log(`[Prowlarr] Extracted config for ${details.name}:`, {
      hasUrl: !!result.baseUrl,
      hasApiKey: !!(result.apiKey || result.passkey),
      type: result.type
    })

    return result
  }

  async search(query: string, indexerIds?: number[], categories?: number[], limit: number = 200, offset: number = 0) {
    const client = this.getClient()
    
    try {
      // Déterminer le type de recherche pour correspondre à ce que Prowlarr attend
      let searchType = 'search'
      if (categories && categories.length > 0) {
        if (categories.some(c => c >= 2000 && c < 3000)) searchType = 'moviesearch'
        else if (categories.some(c => c >= 5000 && c < 6000)) searchType = 'tvsearch'
        else if (categories.some(c => c >= 3000 && c < 4000)) searchType = 'audiosearch'
        else if (categories.some(c => c >= 7000 && c < 8000)) searchType = 'booksearch'
      }

      // Utiliser URLSearchParams pour envoyer correctement les paramètres (surtout les catégories multiples)
      const params = new URLSearchParams()
      params.append('query', query || '')
      params.append('type', searchType)
      params.append('limit', limit.toString())
      params.append('offset', offset.toString())
      
      // Si la query est vide, on force le mode RSS/Recent
      if (!query) {
        params.delete('query')
      }

      if (indexerIds && indexerIds.length > 0) {
        params.append('indexerIds', indexerIds.join(','))
      }

      if (categories && categories.length > 0) {
        // TRÈS IMPORTANT: Prowlarr attend plusieurs fois la clé 'categories'
        categories.forEach(cat => {
          params.append('categories', cat.toString())
        })
      }

      log(`[Prowlarr] Search: type=${searchType}, query="${query}", categories=${categories?.join(',')}`)
      
      const response = await client.get('/search', { params })
      const results = response.data as ProwlarrSearchResult[]

      if (!Array.isArray(results)) {
        return []
      }

      return results.sort((a, b) => {
        const seedersA = a.seeders ?? 0
        const seedersB = b.seeders ?? 0
        if (seedersB !== seedersA) return seedersB - seedersA
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      })
    } catch (e: any) {
      error(`[Prowlarr] Search failed:`, e.response?.data || e.message)
      return []
    }
  }
}
