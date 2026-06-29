import { createAxiosClient } from '@/lib/http-client'
import { cached } from '@/lib/cache-service'
import { CACHE_TTL, TIMEOUT } from '@/lib/constants'
import { getSetting } from '@/lib/settings'
import { logger } from '@/lib/logger'

export async function getTmdbService() {
  // 1. Primary Hardcoded Key
  let apiKey = "7f43cb4adbc635ccad5c04412b284d34"

  // 2. Allow override via Env or Settings if specifically needed (optional)
  if (process.env.TMDB_API_KEY) {
    apiKey = process.env.TMDB_API_KEY
  } else {
    const settingKey = await getSetting('tmdb_api_key')
    if (settingKey) apiKey = settingKey
  }

  if (!apiKey) return null
  return new TmdbService(apiKey)
}

interface DiscoverParams {
    page?: number
    sort_by?: string
    start_date?: string
    end_date?: string
    genres?: number[]
    keywords?: string | number
    language?: string
    min_duration?: number
    max_duration?: number
    watch_region?: string
    watch_providers?: number[]
}

export class TmdbService {
  private apiKey: string
  private client: ReturnType<typeof createAxiosClient>
  private static posterPathCache = new Map<string, string>()

  constructor(apiKey: string) {
    this.apiKey = apiKey
    if (!this.apiKey) {
      throw new Error('TMDB API Key missing')
    }
    this.client = createAxiosClient({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: TIMEOUT.TMDB,
      retries: 2,
      serviceName: 'TMDB',
    })
    this.client.interceptors.request.use((config) => {
      config.params = { ...config.params, api_key: this.apiKey, language: 'fr-FR' }
      return config
    })
  }

  private getClient() {
    return this.client
  }

  async getExternalIds(type: 'movie' | 'tv', id: number) {
    const client = this.getClient()
    try {
      const response = await client.get(`/${type}/${id}/external_ids`)
      return response.data
    } catch (e) {
      logger.error(`[TMDB] Failed to get external IDs for ${type}/${id}`, e)
      return null
    }
  }

  async findByExternalId(externalId: string | number, source: 'imdb_id' | 'tvdb_id') {
    const client = this.getClient()
    try {
      const response = await client.get(`/find/${externalId}`, {
        params: { external_source: source }
      })
      return response.data
    } catch (e) {
      logger.error(`[TMDB] Failed to find by external ID ${externalId}`, e)
      return null
    }
  }

  async searchMulti(query: string, page = 1) {
    const client = this.getClient()
    const response = await client.get('/search/multi', {
      params: { query, page }
    })
    return response.data
  }

  async search(type: 'movie' | 'tv', query: string, page = 1) {
    const client = this.getClient()
    const response = await client.get(`/search/${type}`, {
      params: { query, page }
    })
    return response.data
  }

  async getTrending(type: 'all' | 'movie' | 'tv' = 'movie', page = 1) {
    const client = this.getClient()
    try {
      const response = await client.get(`/trending/${type}/week`, {
        params: { page }
      })
      return response.data
    } catch (error) {
      const err = error as { message?: string; response?: { data?: unknown } }
      logger.error(`[TMDB] getTrending failed: ${err.message}`, err.response?.data)
      return { results: [] }
    }
  }

  async discover(type: 'movie' | 'tv', params: DiscoverParams = {}) {
    const client = this.getClient()

    const queryParams: Record<string, unknown> = {
      page: params.page || 1,
      sort_by: params.sort_by || 'popularity.desc',
      'vote_count.gte': 0,
    }

    if (params.start_date) queryParams[type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'] = params.start_date
    if (params.end_date) queryParams[type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = params.end_date
    if (params.genres && params.genres.length > 0) queryParams.with_genres = params.genres.join(',')
    if (params.keywords) queryParams.with_keywords = params.keywords

    if (params.language && params.language !== 'all') queryParams.with_original_language = params.language
    if (params.min_duration) queryParams['with_runtime.gte'] = params.min_duration
    if (params.max_duration) queryParams['with_runtime.lte'] = params.max_duration
    if (params.watch_region) queryParams.watch_region = params.watch_region
    if (params.watch_providers && params.watch_providers.length > 0) queryParams.with_watch_providers = params.watch_providers.join('|')

    const response = await client.get(`/discover/${type}`, {
      params: queryParams
    })
    return response.data
  }

  async discoverMixed(params: DiscoverParams = {}) {
    const genreIds = params.genres || []

    const mapToMovie = (id: number) => {
      if (id === 10759) return [28, 12]
      if (id === 10765) return [878, 14]
      if (id === 10768) return [10752]
      if (id === 10762) return []
      if (id === 10763) return []
      if (id === 10764) return []
      if (id === 10766) return []
      if (id === 10767) return []
      return [id]
    }

    const mapToTV = (id: number) => {
      if (id === 28) return [10759]
      if (id === 12) return [10759]
      if (id === 878) return [10765]
      if (id === 14) return [10765]
      if (id === 10752) return [10768]
      return [id]
    }

    const movieGenres = genreIds.flatMap(mapToMovie)
    const tvGenres = genreIds.flatMap(mapToTV)

    const [movies, series] = await Promise.all([
      this.discover('movie', { ...params, genres: movieGenres.length > 0 ? movieGenres : undefined }),
      this.discover('tv', { ...params, genres: tvGenres.length > 0 ? tvGenres : undefined })
    ])

    const movieResults = (movies.results || []).map((m: Record<string, unknown>) => ({ ...m, media_type: 'movie' }))
    const tvResults = (series.results || []).map((t: Record<string, unknown>) => ({ ...t, media_type: 'tv' }))

    const combined = [...movieResults, ...tvResults]

    const sortBy = params.sort_by || 'popularity.desc'
    const [field, direction] = sortBy.split('.')

    combined.sort((a, b) => {
      let valA = a[field]
      let valB = b[field]

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
    return cached(`tmdb:genres:${type}`, async () => {
      const client = this.getClient()
      try {
        const response = await client.get(`/genre/${type}/list`)
        return response.data.genres || []
      } catch (e) {
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['tmdb-static'] })
  }

  async getWatchProviders(type: 'movie' | 'tv', region: string) {
    return cached(`tmdb:providers:${type}:${region}`, async () => {
      const client = this.getClient()
      try {
        const response = await client.get(`/watch/providers/${type}`, {
          params: { watch_region: region }
        })
        return response.data.results || []
      } catch (e) {
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['tmdb-static'] })
  }

  private posterPathCache = new Map<string, string>()

  async getPosterPath(id: number, type: 'movie' | 'tv') {
    const cacheKey = `${type}-${id}`
    if (this.posterPathCache.has(cacheKey)) {
      return this.posterPathCache.get(cacheKey)
    }

    try {
      const client = this.getClient()
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
    const client = this.getClient()
    try {
      const response = await client.get(`/${type}/${id}`, {
        params: {
          language: 'fr-FR',
          append_to_response: `videos,images,${type === 'tv' ? 'aggregate_credits' : 'credits'},watch/providers,keywords,external_ids,recommendations,similar`,
          include_image_language: 'fr,en,null'
        }
      })
      return response.data
    } catch (e) {
      logger.error(`Failed to get ${type} details`, e)
      return null
    }
  }

  async getSeasonDetails(tvId: number, seasonNumber: number) {
    const client = this.getClient()
    try {
      const response = await client.get(`/tv/${tvId}/season/${seasonNumber}`, {
        params: { language: 'fr-FR' }
      })
      return response.data
    } catch (e) {
      logger.error(`Failed to fetch season ${seasonNumber} for tv ${tvId}`, e)
      return null
    }
  }

  async getCollectionDetails(collectionId: number) {
    const client = this.getClient()
    try {
      const response = await client.get(`/collection/${collectionId}`)
      return response.data
    } catch (e) {
      logger.error(`Failed to fetch collection ${collectionId}`, e)
      return null
    }
  }

  async getRecommendations(id: number, type: 'movie' | 'tv', page = 1) {
    const client = this.getClient()
    try {
      const response = await client.get(`/${type}/${id}/recommendations`, {
        params: { page }
      })
      return response.data
    } catch (e) {
      logger.error(`Failed to get recommendations for ${type} ${id}`, e)
      return { results: [] }
    }
  }

  async getSimilar(id: number, type: 'movie' | 'tv', page = 1) {
    const client = this.getClient()
    try {
      const response = await client.get(`/${type}/${id}/similar`, {
        params: { page }
      })
      return response.data
    } catch (e) {
      logger.error(`Failed to get similar for ${type} ${id}`, e)
      return { results: [] }
    }
  }

  async getPersonDetails(id: number) {
    const client = this.getClient()
    try {
      const response = await client.get(`/person/${id}`, {
        params: {
          append_to_response: 'combined_credits,external_ids,images',
          language: 'fr-FR'
        }
      })
      return response.data
    } catch (error) {
      const e = error as { response?: { status?: number } }
      if (e.response?.status === 404) {
        try {
          const simpleResponse = await client.get(`/person/${id}`)
          return simpleResponse.data
        } catch (innerError) {
          logger.error(`Total failure for person ${id}`, innerError)
          return null
        }
      }
      logger.error(`Failed to get person details for ${id}`, error)
      return null
    }
  }
}
