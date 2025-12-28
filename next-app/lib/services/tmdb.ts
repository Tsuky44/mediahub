import axios from 'axios'
import { getSetting } from '@/lib/settings'

export class TmdbService {
  private apiKey: string | null = null

  private async getClient() {
    if (!this.apiKey) {
      this.apiKey = await getSetting('tmdb_api_key')
    }
    
    if (!this.apiKey) {
        console.warn('TMDB API Key not configured')
        return null
    }

    return axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      params: {
        api_key: this.apiKey,
        language: 'fr-FR' // Default to French as per user language
      }
    })
  }

  async searchMulti(query: string, page = 1) {
    const client = await this.getClient()
    if (!client) return { results: [] }
    
    const response = await client.get('/search/multi', {
        params: { query, page }
    })
    return response.data
  }

  async getTrending(type: 'all' | 'movie' | 'tv' = 'movie', page = 1) {
      const client = await this.getClient()
      if (!client) return { results: [] }
      
      const response = await client.get(`/trending/${type}/week`, {
          params: { page }
      })
      return response.data
  }

  async discover(type: 'movie' | 'tv', params: any = {}) {
    const client = await this.getClient()
    if (!client) return { results: [] }
    
    // Map internal filter names to TMDB API parameters
    const queryParams: any = {
        page: params.page || 1,
        sort_by: params.sort_by || 'popularity.desc',
        'vote_count.gte': 0,
    }

    if (params.start_date) queryParams[type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'] = params.start_date
    if (params.end_date) queryParams[type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = params.end_date
    if (params.genres && params.genres.length > 0) queryParams.with_genres = params.genres.join(',')
    if (params.keywords) queryParams.with_keywords = params.keywords // ID based, need search first? User input string? 
    // Usually keywords input in UI needs to search for IDs first. 
    // For simplicity, if it's a string, we might skip or assume IDs if formatted. 
    // The Vue component seemed to take text? No, it implies search usually. 
    // Let's assume the user might input text and we need to handle that later or ignore for now if complex.
    // Re-reading Vue: input type text. So it searches keywords? 
    // TMDB with_keywords expects IDs. We'll skip keywords for now or implement search later.

    if (params.language && params.language !== 'all') queryParams.with_original_language = params.language
    if (params.min_duration) queryParams['with_runtime.gte'] = params.min_duration
    if (params.max_duration) queryParams['with_runtime.lte'] = params.max_duration
    if (params.watch_region) queryParams.watch_region = params.watch_region
    if (params.watch_providers && params.watch_providers.length > 0) queryParams.with_watch_providers = params.watch_providers.join('|') // OR logic for providers

    const response = await client.get(`/discover/${type}`, {
        params: queryParams
    })
    return response.data
  }

  async discoverMixed(params: any = {}) {
    const genreIds = params.genres || []

    // Map common genres between Movie and TV
    // If a Movie genre ID is selected, we map it to the corresponding TV genre ID(s)
    // If a TV genre ID is selected, we map it to the corresponding Movie genre ID(s)
    
    const mapToMovie = (id: number) => {
        if (id === 10759) return [28, 12] // Action & Adventure -> Action, Adventure
        if (id === 10765) return [878, 14] // Sci-Fi & Fantasy -> Sci-Fi, Fantasy
        if (id === 10768) return [10752] // War & Politics -> War
        if (id === 10762) return [] // Kids -> Family (10751)? Maybe not direct.
        if (id === 10763) return [] // News -> No movie equivalent
        if (id === 10764) return [] // Reality -> No movie equivalent
        if (id === 10766) return [] // Soap -> No movie equivalent
        if (id === 10767) return [] // Talk -> No movie equivalent
        return [id]
    }

    const mapToTV = (id: number) => {
        if (id === 28) return [10759] // Action -> Action & Adventure
        if (id === 12) return [10759] // Adventure -> Action & Adventure
        if (id === 878) return [10765] // Sci-Fi -> Sci-Fi & Fantasy
        if (id === 14) return [10765] // Fantasy -> Sci-Fi & Fantasy
        if (id === 10752) return [10768] // War -> War & Politics
        return [id]
    }

    const movieGenres = genreIds.flatMap(mapToMovie)
    const tvGenres = genreIds.flatMap(mapToTV)

    // Parallel fetch with mapped genres
    const [movies, series] = await Promise.all([
        this.discover('movie', { ...params, genres: movieGenres.length > 0 ? movieGenres : undefined }),
        this.discover('tv', { ...params, genres: tvGenres.length > 0 ? tvGenres : undefined })
    ])

    const movieResults = (movies.results || []).map((m: any) => ({ ...m, media_type: 'movie' }))
    const tvResults = (series.results || []).map((t: any) => ({ ...t, media_type: 'tv' }))

    // Combine and sort by sort_by param (default popularity)
    const combined = [...movieResults, ...tvResults]
    
    const sortBy = params.sort_by || 'popularity.desc'
    const [field, direction] = sortBy.split('.')
    
    combined.sort((a, b) => {
        let valA = a[field]
        let valB = b[field]
        
        // Handle dates
        if (field === 'release_date' || field === 'primary_release_date') {
            valA = a.release_date || a.first_air_date || ''
            valB = b.release_date || b.first_air_date || ''
        }
        
        if (direction === 'desc') {
            return valA > valB ? -1 : 1
        }
        return valA > valB ? 1 : -1
    })

    return {
        results: combined,
        total_pages: Math.max(movies.total_pages || 0, series.total_pages || 0)
    }
  }

  async getGenres(type: 'movie' | 'tv') {
    const client = await this.getClient()
    if (!client) return []
    try {
        const response = await client.get(`/genre/${type}/list`)
        return response.data.genres || []
    } catch (e) {
        return []
    }
  }

  async getWatchProviders(type: 'movie' | 'tv', region: string) {
    const client = await this.getClient()
    if (!client) return []
    try {
        const response = await client.get(`/watch/providers/${type}`, {
            params: { watch_region: region }
        })
        return response.data.results || []
    } catch (e) {
        return []
    }
  }

  private posterPathCache = new Map<string, string>()

  async getPosterPath(id: number, type: 'movie' | 'tv') {
    const cacheKey = `${type}-${id}`
    if (this.posterPathCache.has(cacheKey)) {
        return this.posterPathCache.get(cacheKey)
    }

    try {
        const client = await this.getClient()
        if (!client) return null
        const response = await client.get(`/${type}/${id}`)
        const path = response.data.poster_path
        if (path) {
            this.posterPathCache.set(cacheKey, path)
        }
        return path
    } catch (e) {
        return null
    }
  }

  async getDetails(id: number, type: 'movie' | 'tv') {
    const client = await this.getClient()
    if (!client) return null
    
    try {
        const response = await client.get(`/${type}/${id}`, {
            params: {
                append_to_response: 'videos,credits,watch/providers,keywords,external_ids,recommendations,similar'
            }
        })
        return response.data
    } catch (e) {
        console.error(`Failed to get ${type} details`, e)
        return null
    }
  }

  async getSeasonDetails(tvId: number, seasonNumber: number) {
      const client = await this.getClient()
      if (!client) return null

      try {
          const response = await client.get(`/tv/${tvId}/season/${seasonNumber}`)
          return response.data
      } catch (e) {
          console.error(`Failed to fetch season ${seasonNumber} for tv ${tvId}`, e)
          return null
      }
  }

  async getCollectionDetails(collectionId: number) {
    const client = await this.getClient()
    if (!client) return null

    try {
        const response = await client.get(`/collection/${collectionId}`)
        return response.data
    } catch (e) {
        console.error(`Failed to fetch collection ${collectionId}`, e)
        return null
    }
  }
}

export const tmdbService = new TmdbService()
