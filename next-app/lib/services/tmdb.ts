import { createAxiosClient } from '@/lib/http-client'
import { cached } from '@/lib/cache-service'
import { createMemoCache } from '@/lib/cache'
import { CACHE_TTL, MS, TIMEOUT } from '@/lib/constants'
import { getSetting } from '@/lib/settings'
import { logger } from '@/lib/logger'

// Caches process-wide partagés par toutes les instances de TmdbService.
// - responses : réponses JSON TMDB (copie à la lecture : certains appelants enrichissent les objets)
// - posters   : affiche et image de fond par média (chemins, très sollicité par les listes)
const responses = createMemoCache({ max: 1500, ttl: CACHE_TTL.API_STATIC, clone: true })
const posters = createMemoCache({ max: 20_000, ttl: MS.DAY })

interface ImagePaths {
  poster_path: string | null
  backdrop_path: string | null
}

let serviceInstance: { apiKey: string; service: TmdbService } | null = null

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
  // Réutilise l'instance (et donc le client HTTP keep-alive) tant que la clé ne change pas
  if (serviceInstance?.apiKey !== apiKey) {
    serviceInstance = { apiKey, service: new TmdbService(apiKey) }
  }
  return serviceInstance.service
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

  /** GET mis en cache (dédupliqué en vol). Les erreurs ne sont jamais mises en cache. */
  private cachedGet(url: string, params: Record<string, unknown> | undefined, ttl: number) {
    const key = `${url}?${JSON.stringify(params ?? {})}`
    return responses.get(key, async () => {
      const response = await this.client.get(url, params ? { params } : undefined)
      return response.data
    }, { ttl })
  }

  async getExternalIds(type: 'movie' | 'tv', id: number) {
    try {
      return await this.cachedGet(`/${type}/${id}/external_ids`, undefined, MS.DAY)
    } catch (e) {
      logger.error(`[TMDB] Failed to get external IDs for ${type}/${id}`, e)
      return null
    }
  }

  async findByExternalId(externalId: string | number, source: 'imdb_id' | 'tvdb_id') {
    try {
      return await this.cachedGet(`/find/${externalId}`, { external_source: source }, MS.DAY)
    } catch (e) {
      logger.error(`[TMDB] Failed to find by external ID ${externalId}`, e)
      return null
    }
  }

  async searchMulti(query: string, page = 1) {
    return this.cachedGet('/search/multi', { query, page }, CACHE_TTL.API_DYNAMIC)
  }

  async search(type: 'movie' | 'tv', query: string, page = 1) {
    return this.cachedGet(`/search/${type}`, { query, page }, CACHE_TTL.API_DYNAMIC)
  }

  async getTrending(type: 'all' | 'movie' | 'tv' = 'movie', page = 1) {
    try {
      return await this.cachedGet(`/trending/${type}/week`, { page }, CACHE_TTL.API_DYNAMIC)
    } catch (error) {
      const err = error as { message?: string; response?: { data?: unknown } }
      logger.error(`[TMDB] getTrending failed: ${err.message}`, err.response?.data)
      return { results: [] }
    }
  }

  async discover(type: 'movie' | 'tv', params: DiscoverParams = {}) {
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

    return this.cachedGet(`/discover/${type}`, queryParams, CACHE_TTL.API_DYNAMIC)
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

  /** Affiche et image de fond d'un média (un seul appel, mis en cache 24 h) */
  async getImagePaths(id: number, type: 'movie' | 'tv'): Promise<ImagePaths> {
    try {
      return await posters.get<ImagePaths>(`${type}-${id}`, async () => {
        const response = await this.getClient().get(`/${type}/${id}`)
        return { poster_path: response.data.poster_path ?? null, backdrop_path: response.data.backdrop_path ?? null }
      })
    } catch (e) {
      return { poster_path: null, backdrop_path: null }
    }
  }

  async getPosterPath(id: number, type: 'movie' | 'tv') {
    return (await this.getImagePaths(id, type)).poster_path
  }

  async getDetails(id: number, type: 'movie' | 'tv') {
    try {
      const details = await this.cachedGet(`/${type}/${id}`, {
        language: 'fr-FR',
        append_to_response: `videos,images,${type === 'tv' ? 'aggregate_credits' : 'credits'},watch/providers,keywords,external_ids,recommendations,similar`,
        include_image_language: 'fr,en,null'
      }, CACHE_TTL.API_STATIC)
      // Alimente le cache des images (évite un appel getImagePaths ultérieur)
      if (details?.poster_path) {
        posters.set(`${type}-${id}`, { poster_path: details.poster_path, backdrop_path: details.backdrop_path ?? null })
      }
      return details
    } catch (e) {
      logger.error(`Failed to get ${type} details`, e)
      return null
    }
  }

  async getSeasonDetails(tvId: number, seasonNumber: number) {
    try {
      return await this.cachedGet(`/tv/${tvId}/season/${seasonNumber}`, { language: 'fr-FR' }, CACHE_TTL.API_STATIC)
    } catch (e) {
      logger.error(`Failed to fetch season ${seasonNumber} for tv ${tvId}`, e)
      return null
    }
  }

  async getCollectionDetails(collectionId: number) {
    try {
      return await this.cachedGet(`/collection/${collectionId}`, undefined, CACHE_TTL.API_STATIC)
    } catch (e) {
      logger.error(`Failed to fetch collection ${collectionId}`, e)
      return null
    }
  }

  async getRecommendations(id: number, type: 'movie' | 'tv', page = 1) {
    try {
      return await this.cachedGet(`/${type}/${id}/recommendations`, { page }, CACHE_TTL.API_STATIC)
    } catch (e) {
      logger.error(`Failed to get recommendations for ${type} ${id}`, e)
      return { results: [] }
    }
  }

  async getSimilar(id: number, type: 'movie' | 'tv', page = 1) {
    try {
      return await this.cachedGet(`/${type}/${id}/similar`, { page }, CACHE_TTL.API_STATIC)
    } catch (e) {
      logger.error(`Failed to get similar for ${type} ${id}`, e)
      return { results: [] }
    }
  }

  async getPersonDetails(id: number) {
    try {
      return await this.cachedGet(`/person/${id}`, {
        append_to_response: 'combined_credits,external_ids,images',
        language: 'fr-FR'
      }, CACHE_TTL.API_STATIC)
    } catch (error) {
      const e = error as { response?: { status?: number } }
      if (e.response?.status === 404) {
        try {
          return await this.cachedGet(`/person/${id}`, undefined, CACHE_TTL.API_STATIC)
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
