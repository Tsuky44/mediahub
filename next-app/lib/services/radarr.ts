import axios from 'axios'

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
  tags: number[];
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

export class RadarrService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private getClient() {
    return axios.create({
      baseURL: `${this.baseUrl}/api/v3`,
      headers: {
        'X-Api-Key': this.apiKey
      },
      timeout: 10000
    })
  }

  async getProfiles() {
    const client = this.getClient()
    try {
      const response = await client.get('/qualityprofile')
      return response.data
    } catch (e: any) {
      console.error('[Radarr] Failed to fetch profiles:', e.message)
      return []
    }
  }

  async getRootFolders() {
    const client = this.getClient()
    try {
      const response = await client.get('/rootfolder')
      return response.data
    } catch (e: any) {
      console.error('[Radarr] Failed to fetch root folders:', e.message)
      return []
    }
  }

  async getMovies() {
    const client = this.getClient()
    try {
      const response = await client.get('/movie')
      return response.data as RadarrMovie[]
    } catch (e: any) {
      console.error('[Radarr] Failed to fetch movies:', e.message)
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
        } catch (e: any) {
          console.error(`[Radarr] Failed to fetch full movie data for ${movie.id}:`, e.message)
          // Fallback to lookup data if full fetch fails
        }
      }
      
      return movie
    } catch (e: any) {
      console.error(`[Radarr] Failed to lookup movie ${tmdbId}:`, e.message)
      return null
    }
  }

  async addMovie(options: RadarrMovieOptions) {
    const client = this.getClient()
    try {
      const movie = await this.getMovieByTmdbId(options.tmdbId)

      if (movie && movie.id) {
        // Movie exists
        if (movie.hasFile) {
          return { success: true, message: 'Movie already available', movie }
        }
        
        if (!movie.monitored && options.monitored) {
          // Update to monitored
          const updateData = {
            ...movie,
            monitored: true,
            addOptions: {
              searchForMovie: options.searchNow
            }
          }
          await client.put(`/movie/${updateData.id}`, updateData)
          return { success: true, message: 'Movie set to monitored', movie: updateData }
        }

        return { success: true, message: 'Movie already exists', movie }
      }

      // Add new movie
      // Use the looked up movie data to ensure we have all required fields (like images, etc)
      // or construct payload carefully.
      // Usually it's safer to use the lookup result as base if available, but here `movie` is null or ID-less.
      // Actually, lookup returns the movie object even if not in DB (id is 0 or undefined).
      
      const payload = movie ? { ...movie } : {} as any
      
      // Override with options
      payload.title = options.title
      payload.qualityProfileId = options.qualityProfileId
      payload.tmdbId = options.tmdbId
      payload.year = options.year
      payload.rootFolderPath = options.rootFolderPath
      payload.monitored = options.monitored !== false
      payload.minimumAvailability = options.minimumAvailability || 'announced'
      payload.addOptions = {
        searchForMovie: options.searchNow !== false
      }

      const response = await client.post('/movie', payload)
      return { success: true, movie: response.data }

    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message
      // Only log full error if it's not a known "already exists" which we handle above usually
      if (!Array.isArray(e.response?.data) || e.response.data[0]?.errorCode !== 'MovieExistsValidator') {
         console.error(`[Radarr] Failed to add movie ${options.tmdbId}:`, JSON.stringify(e.response?.data || errorMsg))
      }
      return { success: false, message: errorMsg }
    }
  }

  async deleteMovie(radarrId: number, deleteFiles: boolean = false) {
    const client = this.getClient()

    try {
        console.log(`[Radarr] Deleting movie ${radarrId} (deleteFiles: ${deleteFiles})`);
        await client.delete(`/movie/${radarrId}`, {
            params: {
                deleteFiles: deleteFiles,
                addImportExclusion: false
            }
        });
        return { success: true };
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message;
        console.error(`[Radarr] Failed to delete movie ${radarrId}:`, errorMsg);
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
    } catch (e: any) {
      console.error(`[Radarr] Failed to unmonitor movie ${tmdbId}:`, e.message)
      return { success: false, message: e.message }
    }
  }
}
