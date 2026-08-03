import { createAxiosClient } from '@/lib/http-client'
import { cached } from '@/lib/cache-service'
import { CACHE_TTL, TIMEOUT } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { getSetting } from '../settings'

interface AppError extends Error {
  response?: {
    data?: unknown
  }
}


export async function getRadarrService() {
  const url = await getSetting('radarr_url')
  const apiKey = await getSetting('radarr_api_key')
  
  if (!url || !apiKey) return null
  return new RadarrService(url, apiKey)
}

export interface RadarrMovieFile {
  id: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  sceneName?: string;
  quality: {
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  };
  mediaInfo?: {
    audioChannels: number;
    audioCodec: string;
    videoCodec: string;
  };
  languages: {
      id: number;
      name: string;
  }[];
}

export interface RadarrMovie {
  id: number;
  title: string;
  isAvailable: boolean;
  monitored: boolean;
  tmdbId: number;
  imdbId: string;
  titleSlug: string;
  folderName: string;
  path: string;
  profileId: number;
  qualityProfileId: number;
  added: string;
  hasFile: boolean;
  movieFile?: RadarrMovieFile;
  tags: number[];
  overview?: string;
  year?: number;
  images?: {
    coverType: string;
    url: string;
  }[];
}

export interface RadarrMovieOptions {
  title: string;
  qualityProfileId: number;
  minimumAvailability: string;
  tags?: number[];
  profileId?: number; // Metadata profile
  year: number;
  rootFolderPath: string;
  tmdbId: number;
  monitored?: boolean;
  searchNow?: boolean;
}

export interface RadarrQueueItem {
  id: number;
  size: number;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: string;
  status: string;
  trackedDownloadStatus: string;
  /** e.g. "downloading" | "importPending" | "importing" | "completed" | "failed" */
  trackedDownloadState?: string;
  title: string;
  movieId?: number; // Added movieId
  downloadId?: string; // Added downloadId (hash)
  movie?: {
    id: number;
    title: string;
    tmdbId: number;
  };
}

export class RadarrService {
  private client: ReturnType<typeof createAxiosClient>

  constructor(baseUrl: string, apiKey: string) {
    const cleanUrl = baseUrl.replace(/\/$/, '')
    this.client = createAxiosClient({
      baseURL: `${cleanUrl}/api/v3`,
      headers: { 'X-Api-Key': apiKey },
      timeout: TIMEOUT.RADARR,
      retries: 2,
      serviceName: 'Radarr',
    })
  }

  private getClient() {
    return this.client
  }

  async sendCommand(name: string, params: Record<string, unknown> = {}) {
    const client = this.getClient()
    try {
      const response = await client.post('/command', {
        name,
        ...params
      })
      return { success: true, data: response.data }
    } catch (e) {
      logger.error(`[Radarr] Failed to send command ${name}:`, (e as AppError).message)
      return { success: false, error: (e as AppError).message }
    }
  }

  async getQueue() {
    const client = this.getClient()
    try {
      const response = await client.get('/queue', {
        params: {
          pageSize: 1000,
          includeUnknownMovieItems: true,
          includeMovie: true,
        }
      })
      return (response.data.records || response.data) as RadarrQueueItem[]
    } catch (e) {
      logger.error('[Radarr] Failed to fetch queue:', (e as AppError).message)
      return []
    }
  }

  /**
   * Supprime un item de la queue Radarr.
   * @param queueItemId - L'ID de l'item dans la queue
   * @param options - Options de suppression (fichiers, blacklist)
   */
  async removeFromQueue(
    queueItemId: number,
    options: {
      removeFromClient?: boolean
      blocklist?: boolean
      skipRedownload?: boolean
      changeCategory?: boolean
    } = {}
  ): Promise<{ success: boolean; message?: string }> {
    const client = this.getClient()
    try {
      const params = new URLSearchParams()
      if (options.removeFromClient !== false) params.append('removeFromClient', 'true')
      if (options.blocklist) params.append('blocklist', 'true')
      if (options.skipRedownload) params.append('skipRedownload', 'true')
      if (options.changeCategory) params.append('changeCategory', 'true')

      await client.delete(`/queue/${queueItemId}?${params.toString()}`)
      logger.info(`[Radarr] Removed queue item ${queueItemId}`, options)
      return { success: true }
    } catch (e) {
      const errorMsg = (e as AppError).message
      logger.error(`[Radarr] Failed to remove queue item ${queueItemId}:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async getProfiles() {
    return cached('radarr:profiles', async () => {
      const client = this.getClient()
      try {
        const response = await client.get('/qualityprofile')
        return response.data
      } catch (e) {
        logger.error('[Radarr] Failed to fetch profiles:', (e as AppError).message)
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['radarr-static'] })
  }

  async getRootFolders() {
    return cached('radarr:rootfolders', async () => {
      const client = this.getClient()
      try {
        const response = await client.get('/rootfolder')
        return response.data
      } catch (e) {
        logger.error('[Radarr] Failed to fetch root folders:', (e as AppError).message)
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['radarr-static'] })
  }

  async getMovies() {
    const client = this.getClient()
    try {
      const response = await client.get('/movie')
      return response.data as RadarrMovie[]
    } catch (e) {
      logger.error('[Radarr] Failed to fetch movies:', (e as AppError).message)
      return []
    }
  }

  async getMovieByTmdbId(tmdbId: number): Promise<RadarrMovie | null> {
    const client = this.getClient()
    try {
      const response = await client.get('/movie/lookup', {
        params: { term: `tmdb:${tmdbId}` }
      })
      
      if (!response.data || response.data.length === 0) {
        return null
      }
      
      const movie = response.data[0]
      
      // If the movie is already in the library (has an id), fetch the full data
      // from the /movie/{id} endpoint to ensure we have up-to-date status.
      if (movie.id) {
        try {
          const fullResponse = await client.get(`/movie/${movie.id}`)
          if (fullResponse.data) {
            return fullResponse.data
          }
        } catch (e) {
          logger.error(`[Radarr] Failed to fetch full movie data for ${movie.id}:`, (e as AppError).message)
          // Fallback to lookup data if full fetch fails
        }
      }
      
      return movie
    } catch (e) {
      logger.error(`[Radarr] Failed to lookup movie ${tmdbId}:`, (e as AppError).message)
      return null
    }
  }

  async addMovie(options: RadarrMovieOptions) {
    const client = this.getClient()
    const writeTimeout = 60_000
    try {
      const movie = await this.getMovieByTmdbId(options.tmdbId)

      if (movie && movie.id) {
        // Movie exists
        if (movie.hasFile) {
          return { success: true, message: 'Movie already available', movie }
        }
        
        if (!movie.monitored && options.monitored) {
          const updateData = {
            ...movie,
            monitored: true,
          }
          await client.put(`/movie/${updateData.id}`, updateData, { timeout: writeTimeout })
          if (options.searchNow && updateData.id) {
            this.sendCommand('MoviesSearch', { movieIds: [updateData.id] }).catch((e) =>
              logger.warn(`[Radarr] Background MoviesSearch failed for ${updateData.id}:`, (e as AppError).message)
            )
          }
          return { success: true, message: 'Movie set to monitored', movie: updateData }
        }

        return { success: true, message: 'Movie already exists', movie }
      }

      // Add new movie
      // Use the looked up movie data to ensure we have all required fields (like images, etc)
      // or construct payload carefully.
      // Usually it's safer to use the lookup result as base if available, but here `movie` is null or ID-less.
      // Actually, lookup returns the movie object even if not in DB (id is 0 or undefined).
      
      const payload: Record<string, unknown> = movie ? { ...movie } : {}
      
      // Override with options
      payload.title = options.title
      payload.qualityProfileId = options.qualityProfileId
      payload.tmdbId = options.tmdbId
      payload.year = options.year
      payload.rootFolderPath = options.rootFolderPath
      payload.monitored = options.monitored !== false
      payload.minimumAvailability = options.minimumAvailability || 'announced'
      payload.addOptions = {
        searchForMovie: false
      }

      const response = await client.post('/movie', payload, { timeout: writeTimeout })

      if (options.searchNow !== false && response.data?.id) {
        this.sendCommand('MoviesSearch', { movieIds: [response.data.id] }).catch((e) =>
          logger.warn(`[Radarr] Background MoviesSearch failed for ${response.data.id}:`, (e as AppError).message)
        )
      }

      return { success: true, movie: response.data }

    } catch (e) {
      const errorMsg = ((e as AppError).response?.data as { message?: string } | undefined)?.message || (e as AppError).message
      // Only log full error if it's not a known "already exists" which we handle above usually
      if (!Array.isArray((e as AppError).response?.data) || ((e as AppError).response?.data as Array<{ errorCode?: string }> | undefined)?.[0]?.errorCode !== 'MovieExistsValidator') {
         logger.error(`[Radarr] Failed to add movie ${options.tmdbId}:`, JSON.stringify((e as AppError).response?.data || errorMsg))
      }
      return { success: false, message: errorMsg }
    }
  }

  async deleteMovie(radarrId: number, deleteFiles: boolean = false) {
    const client = this.getClient()

    try {
        logger.info(`[Radarr] Deleting movie ${radarrId} (deleteFiles: ${deleteFiles})`);
        await client.delete(`/movie/${radarrId}`, {
            params: {
                deleteFiles: deleteFiles,
                addImportExclusion: false
            }
        });
        return { success: true };
    } catch (e) {
        const errorMsg = ((e as AppError).response?.data as { message?: string } | undefined)?.message || (e as AppError).message;
        logger.error(`[Radarr] Failed to delete movie ${radarrId}:`, errorMsg);
        return { success: false, message: errorMsg };
    }
  }

  async unmonitorMovie(tmdbId: number) {
    const client = this.getClient()
    try {
      const movie = await this.getMovieByTmdbId(tmdbId)
      if (!movie || !movie.id) {
        return { success: false, message: 'Movie not found in Radarr' }
      }

      if (!movie.monitored) {
          return { success: true, message: 'Movie already unmonitored' }
      }

      movie.monitored = false
      const response = await client.put(`/movie/${movie.id}`, movie)
      return { success: true, movie: response.data }
    } catch (e) {
      logger.error(`[Radarr] Failed to unmonitor movie ${tmdbId}:`, (e as AppError).message)
      return { success: false, message: (e as AppError).message }
    }
  }

  async getReleases(movieId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/release', {
        params: { movieId }
      })
      return response.data
    } catch (e) {
      logger.error(`[Radarr] Failed to fetch releases for movie ${movieId}:`, (e as AppError).message)
      return []
    }
  }

  async downloadRelease(guid: string, indexerId: number) {
    const client = this.getClient()
    try {
      const response = await client.post('/release', {
        guid,
        indexerId
      })
      return { success: true, data: response.data }
    } catch (e) {
      const errorMsg = ((e as AppError).response?.data as { message?: string } | undefined)?.message || (e as AppError).message
      logger.error(`[Radarr] Failed to download release ${guid}:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async pushRelease(release: Record<string, unknown>) {
    const client = this.getClient()
    try {
      const response = await client.post('/release/push', release)
      return { success: true, data: response.data }
    } catch (e) {
      const errorMsg = ((e as AppError).response?.data as { message?: string } | undefined)?.message || (e as AppError).message
      logger.error(`[Radarr] Failed to push release:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async getCalendar(start: Date, end: Date) {
    const client = this.getClient()
    try {
      // Radarr expects YYYY-MM-DD format
      const startDate = start.toISOString().split('T')[0]
      const endDate = end.toISOString().split('T')[0]
      
      const response = await client.get('/calendar', {
        params: {
          start: startDate,
          end: endDate
        }
      })
      return response.data as RadarrMovie[]
    } catch (e) {
      logger.error('[Radarr] Failed to fetch calendar:', (e as AppError).message)
      return []
    }
  }
}
