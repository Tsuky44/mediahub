import axios from 'axios'
import { getSetting } from '../settings'

export async function getSonarrService() {
  const url = await getSetting('sonarr_url')
  const apiKey = await getSetting('sonarr_api_key')
  
  if (!url || !apiKey) return null
  return new SonarrService(url, apiKey)
}

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
  tmdbId?: number;
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
  seriesId?: number; // Added seriesId
  downloadId?: string; // Added downloadId (hash)
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

  async sendCommand(name: string, params: any = {}) {
    const client = this.getClient()
    try {
      const response = await client.post('/command', {
        name,
        ...params
      })
      return { success: true, data: response.data }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to send command ${name}:`, e.message)
      return { success: false, error: e.message }
    }
  }

  async getQueue() {
    const client = this.getClient()
    try {
      const response = await client.get('/queue', {
        params: {
          pageSize: 1000,
          includeUnknownSeriesItems: true
        }
      })
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

  async getSeriesByTvdbId(tvdbId: number): Promise<SonarrSeries | null> {
    const client = this.getClient()
    if (!client) return null
    
    try {
      // Use /series/lookup to find the series by TVDB ID
      // This works even if the series is not in the library yet (for metadata)
      // But it also returns the existing series object if it is in the library
      const response = await client.get('/series/lookup', {
        params: { term: `tvdb:${tvdbId}` }
      })
      
      if (!response.data || response.data.length === 0) {
        return null
      }
      
      const series = response.data[0]
      
      // IMPORTANT: lookup returns the series info from SkyHook (metadata provider)
      // If the series is in our library, it will have an 'id' field > 0.
      // However, sometimes lookup returns a structure that looks like library data but might be missing monitored/file details
      // So if we have an ID, we should fetch the specific series from our library to be 100% sure about files/monitoring.
      
      if (series.id && series.id > 0) {
        try {
          const fullResponse = await client.get(`/series/${series.id}`)
          if (fullResponse.data) {
            return fullResponse.data
          }
        } catch (e: any) {
          console.error(`[Sonarr] Failed to fetch full series data for ${series.id}:`, e.message)
          // If 404, it means it's not actually in library despite ID? Unlikely, but safe to fallback or return null.
          // If the ID exists in lookup but not in /series/{id}, it might be a weird state.
          // But usually lookup returns id=0 or undefined if not in library.
        }
      }
      
      // If series.id is missing or 0, it means it's NOT in the library.
      // In this case, we should return NULL because getMediaAvailability checks for library presence.
      // If we return the lookup result, the system thinks it's in the library (but unmonitored/no files).
      
      return null
      
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
        // Check if already monitored
        if (series.monitored) {
           return { success: true, message: 'Series already monitored', series }
        }

        // Update to monitored
        const updateData = {
          ...series,
          monitored: true,
          addOptions: {
            searchForMissingEpisodes: options.searchNow
          }
        }
        
        await client.put(`/series/${series.id}`, updateData)
        return { success: true, message: 'Series set to monitored', series: updateData }
      }

      // Add new series
      const payload = {
        tvdbId: options.tvdbid,
        title: options.title,
        qualityProfileId: options.qualityProfileId,
        languageProfileId: options.languageProfileId || 1,
        seasonFolder: options.seasonFolder,
        monitored: options.monitored !== false,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags || [],
        seriesType: options.seriesType,
        seasons: options.seasons ? this.buildSeasonList(options.seasons, series?.seasons || []) : [],
        addOptions: {
          searchForMissingEpisodes: options.searchNow !== false
        }
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

  async deleteSeries(seriesId: number, deleteFiles: boolean = false) {
    const client = this.getClient()
    try {
      await client.delete(`/series/${seriesId}`, {
        params: {
          deleteFiles
        }
      })
      return { success: true }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to delete series ${seriesId}:`, e.message)
      return { success: false, error: e.message }
    }
  }

  async deleteEpisodeFile(episodeFileId: number) {
    const client = this.getClient()
    try {
      await client.delete(`/episodefile/${episodeFileId}`)
      return { success: true }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to delete episode file ${episodeFileId}:`, e.message)
      return { success: false, error: e.message }
    }
  }

  async unmonitorSeason(seriesId: number, seasonNumber: number) {
    const client = this.getClient()
    try {
      // 1. Get the series
      const response = await client.get(`/series/${seriesId}`)
      const series = response.data as SonarrSeries

      if (!series) throw new Error('Series not found')

      // 2. Update the specific season
      const updatedSeasons = series.seasons.map(s => {
        if (s.seasonNumber === seasonNumber) {
          return { ...s, monitored: false }
        }
        return s
      })

      // 3. Save
      const updateData = {
        ...series,
        seasons: updatedSeasons
      }

      await client.put(`/series/${seriesId}`, updateData)
      return { success: true }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to unmonitor season ${seasonNumber} for series ${seriesId}:`, e.message)
      return { success: false, error: e.message }
    }
  }

  async monitorSeason(tvdbId: number, seasonNumber: number) {
    const client = this.getClient()
    try {
      const series = await this.getSeriesByTvdbId(tvdbId)
      if (!series || !series.id) {
        return { success: false, message: 'Series not found in Sonarr' }
      }

      const seasonIndex = series.seasons.findIndex(s => s.seasonNumber === seasonNumber)
      if (seasonIndex === -1) {
          return { success: false, message: 'Season not found in Sonarr' }
      }

      if (series.seasons[seasonIndex].monitored && series.monitored) {
          return { success: true, message: 'Season already monitored', series }
      }

      series.seasons[seasonIndex].monitored = true
      series.monitored = true // Ensure series is monitored too

      const response = await client.put(`/series/${series.id}`, series)
      return { success: true, series: response.data }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to monitor season ${seasonNumber} for ${tvdbId}:`, e.message)
      return { success: false, message: e.message }
    }
  }

  async monitorEpisode(tvdbId: number, seasonNumber: number, episodeNumber: number) {
    const client = this.getClient()
    try {
      const series = await this.getSeriesByTvdbId(tvdbId)
      if (!series || !series.id) {
        return { success: false, message: 'Series not found in Sonarr' }
      }

      // First ensure the series and season are monitored
      let seriesChanged = false
      if (!series.monitored) {
        series.monitored = true
        seriesChanged = true
      }

      const seasonIndex = series.seasons.findIndex(s => s.seasonNumber === seasonNumber)
      if (seasonIndex !== -1 && !series.seasons[seasonIndex].monitored) {
        series.seasons[seasonIndex].monitored = true
        seriesChanged = true
      }

      if (seriesChanged) {
        await client.put(`/series/${series.id}`, series)
      }

      // Now monitor the specific episode
      const episodes = await this.getEpisodes(series.id)
      const episode = episodes.find((e: any) => e.seasonNumber === seasonNumber && e.episodeNumber === episodeNumber)
      
      if (!episode) {
        return { success: false, message: 'Episode not found in Sonarr' }
      }

      if (episode.monitored) {
        return { success: true, message: 'Episode already monitored' }
      }

      episode.monitored = true
      await client.put(`/episode/${episode.id}`, episode)

      return { success: true }
    } catch (e: any) {
      console.error(`[Sonarr] Failed to monitor episode S${seasonNumber}E${episodeNumber} for ${tvdbId}:`, e.message)
      return { success: false, message: e.message }
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

  async pushRelease(release: any) {
    const client = this.getClient()
    try {
      const response = await client.post('/release/push', release)
      return { success: true, data: response.data }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message
      console.error(`[Sonarr] Failed to push release:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async getCalendar(start: Date, end: Date) {
    const client = this.getClient()
    try {
      const startDate = start.toISOString().split('T')[0]
      const endDate = end.toISOString().split('T')[0]

      const response = await client.get('/calendar', {
        params: {
          start: startDate,
          end: endDate,
          includeSeries: true
        }
      })
      return response.data as any[] // Sonarr calendar returns episodes with series info
    } catch (e: any) {
      console.error('[Sonarr] Failed to fetch calendar:', e.message)
      return []
    }
  }
}
