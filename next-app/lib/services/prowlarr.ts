import axios from 'axios'

export interface ProwlarrIndexer {
  id: number
  name: string
  fields: any[]
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
      console.error('[Prowlarr] Failed to fetch indexers:', e.message)
      return []
    }
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

      console.log(`[Prowlarr] Search: type=${searchType}, query="${query}", categories=${categories?.join(',')}`)
      
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
      console.error(`[Prowlarr] Search failed:`, e.response?.data || e.message)
      return []
    }
  }
}
