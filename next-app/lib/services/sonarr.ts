import axios from 'axios'

export interface SonarrEpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  relativePath: string;
  path: string;
  size: number;
  dateAdded: string;
  sceneName: string;
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
  languages: {
      id: number;
      name: string;
  }[];
  mediaInfo?: {
    audioChannels: number;
    audioCodec: string;
    videoCodec: string;
  };
}

export interface SonarrSeason {
  seasonNumber: number;
  monitored: boolean;
  statistics?: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}

export interface SonarrSeries {
  id?: number;
  title: string;
  sortTitle: string;
  seasonCount: number;
  status: string;
  overview: string;
  network: string;
  airTime: string;
  images: {
    coverType: string;
    url: string;
  }[];
  remotePoster: string;
  seasons: SonarrSeason[];
  year: number;
  path: string;
  profileId: number;
  languageProfileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  tvdbId: number;
  imdbId: string;
  titleSlug: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  qualityProfileId: number;
  rootFolderPath?: string;
  statistics: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}

export interface AddSeriesOptions {
  tvdbid: number;
  title: string;
  qualityProfileId: number;
  languageProfileId?: number;
  seasons: number[];
  seasonFolder: boolean;
  rootFolderPath: string;
  tags?: number[];
  seriesType: 'standard' | 'daily' | 'anime';
  monitored?: boolean;
  searchNow?: boolean;
}

export interface SonarrQueueItem {
  id: number;
  size: number;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: string;
  status: string;
  trackedDownloadStatus: string;
  title: string;
  series?: {
    id: number;
    title: string;
    tvdbId: number;
  };
  episode?: {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
  };
}

export class SonarrService {
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

  async getQueue() {
    const client = this.getClient()
    try {
      const response = await client.get('/queue')
      return (response.data.records || response.data) as SonarrQueueItem[]
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch queue:', e.message)
      return []
    }
  }

  async getProfiles() {
    const client = this.getClient()
    try {
      const response = await client.get('/qualityprofile')
      return response.data
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch profiles:', e.message)
      return []
    }
  }

  async getLanguageProfiles() {
    const client = this.getClient()
    try {
      const response = await client.get('/languageprofile')
      return response.data
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch language profiles:', e.message)
      return []
    }
  }

  async getRootFolders() {
    const client = this.getClient()
    try {
      const response = await client.get('/rootfolder')
      return response.data
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch root folders:', e.message)
      return []
    }
  }

  async getSeries() {
    const client = this.getClient()
    try {
      const response = await client.get('/series')
      return response.data as SonarrSeries[]
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch series:', e.message)
      return []
    }
  }

  async getSeriesByTvdbId(tvdbId: number): Promise<SonarrSeries | null> {
    const client = this.getClient()
    try {
      const response = await client.get('/series/lookup', {
        params: { term: `tvdb:${tvdbId}` }
      })
      
      if (!response.data || response.data.length === 0) {
        return null
      }
      
      const series = response.data[0]
      
      // If the series is already in the library (has an id), fetch the full data
      // from the /series/{id} endpoint to ensure we have up-to-date statistics.
      if (series.id) {
        try {
          const fullResponse = await client.get(`/series/${series.id}`)
          if (fullResponse.data) {
            return fullResponse.data
          }
        } catch (e: any) {
          console.error(`[Sonarr] Failed to fetch full series data for ${series.id}:`, e.message)
          // Fallback to lookup data if full fetch fails
        }
      }
      
      return series
    } catch (e: any) {
      console.error(`[Sonarr] Failed to lookup series ${tvdbId}:`, e.message)
      return null
    }
  }

  async getEpisodeFiles(seriesId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/episodefile', {
        params: { seriesId }
      })
      return response.data as SonarrEpisodeFile[]
    } catch (e: any) {
      console.error(`[Sonarr] Failed to fetch episode files for series ${seriesId}:`, e.message)
      return []
    }
  }

  private buildSeasonList(seasons: number[], existingSeasons: SonarrSeason[]): SonarrSeason[] {
    return existingSeasons.map((season) => {
      // Monitor if in requested list, otherwise unmonitor
      return {
        ...season,
        monitored: seasons.includes(season.seasonNumber)
      };
    });
  }

  async addSeries(options: AddSeriesOptions) {
    const client = this.getClient()
    try {
      const series = await this.getSeriesByTvdbId(options.tvdbid)

      if (series && series.id) {
        // Series exists, update it
        // Merge options
        series.monitored = options.monitored ?? series.monitored
        series.tags = options.tags ? Array.from(new Set([...series.tags, ...options.tags])) : series.tags
        
        // Update seasons monitoring
        series.seasons = this.buildSeasonList(options.seasons, series.seasons)
        
        const response = await client.put(`/series/${series.id}`, {
            ...series,
            addOptions: {
                searchForMissingEpisodes: options.searchNow
            }
        })
        
        return { success: true, message: 'Series updated', series: response.data }
      }

      // Add new series
      const payload = series ? { ...series } : {} as any
      
      payload.title = options.title
      payload.qualityProfileId = options.qualityProfileId
      payload.tvdbId = options.tvdbid
      payload.rootFolderPath = options.rootFolderPath
      payload.monitored = options.monitored !== false
      payload.seasonFolder = options.seasonFolder !== false
      payload.seriesType = options.seriesType || 'standard'
      
      if (options.languageProfileId) {
          payload.languageProfileId = options.languageProfileId
      }
      
      // Update seasons monitoring for the new series
      if (payload.seasons) {
          payload.seasons = this.buildSeasonList(options.seasons, payload.seasons)
      }

      payload.addOptions = {
        searchForMissingEpisodes: options.searchNow !== false,
        ignoreEpisodesWithFiles: false,
        ignoreEpisodesWithoutFiles: false
      }

      const response = await client.post('/series', payload)
      return { success: true, series: response.data }

    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message
      if (!Array.isArray(e.response?.data) || e.response.data[0]?.errorCode !== 'SeriesExistsValidator') {
         console.error(`[Sonarr] Failed to add series ${options.tvdbid}:`, JSON.stringify(e.response?.data || errorMsg))
      }
      return { success: false, message: errorMsg }
    }
  }

  async deleteSeries(sonarrId: number, deleteFiles: boolean = false) {
    const client = this.getClient()

    try {
        console.log(`[Sonarr] Deleting series ${sonarrId} (deleteFiles: ${deleteFiles})`);
        await client.delete(`/series/${sonarrId}`, {
            params: {
                deleteFiles: deleteFiles,
                addImportExclusion: false
            }
        });
        return { success: true };
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message;
        console.error(`[Sonarr] Failed to delete series ${sonarrId}:`, errorMsg);
        return { success: false, message: errorMsg };
    }
  }

  async unmonitorSeasons(tvdbId: number, seasonsToUnmonitor: number[]) {
    const client = this.getClient()
    try {
      const series = await this.getSeriesByTvdbId(tvdbId)
      if (!series || !series.id) {
        return { success: false, message: 'Series not found in Sonarr' }
      }

      // Update seasons monitoring
      let changed = false;
      series.seasons = series.seasons.map(s => {
        if (seasonsToUnmonitor.includes(s.seasonNumber) && s.monitored) {
          s.monitored = false
          changed = true
        }
        return s
      })

      if (!changed) {
          return { success: true, message: 'No seasons needed unmonitoring', series }
      }

      // If all seasons are unmonitored (ignoring specials), unmonitor the whole series
      const monitoredSeasons = series.seasons.filter(s => s.seasonNumber > 0 && s.monitored)
      if (monitoredSeasons.length === 0) {
        series.monitored = false
      }
      
      const response = await client.put(`/series/${series.id}`, series)
      return { success: true, series: response.data }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to unmonitor seasons for ${tvdbId}:`, e.message)
      return { success: false, message: e.message }
    }
  }

  async getEpisodes(seriesId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/episode', {
        params: { seriesId }
      })
      return response.data
    } catch (e: any) {
      console.error(`[Sonarr] Failed to fetch episodes for series ${seriesId}:`, e.message)
      return []
    }
  }

  async getReleases(episodeId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/release', { params: { episodeId } })
      return response.data
    } catch (e: any) {
      console.error(`[Sonarr] Failed to fetch releases for episode ${episodeId}:`, e.message)
      return []
    }
  }

  async getSeasonReleases(seriesId: number, seasonNumber: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/release', { params: { seriesId, seasonNumber } })
      return response.data
    } catch (e: any) {
      console.error(`[Sonarr] Failed to fetch releases for series ${seriesId} season ${seasonNumber}:`, e.message)
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
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message
      console.error(`[Sonarr] Failed to download release ${guid}:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }
}
