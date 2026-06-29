import { createAxiosClient } from '@/lib/http-client'
import { cached } from '@/lib/cache-service'
import { CACHE_TTL, TIMEOUT } from '@/lib/constants'
import { logger } from '@/lib/logger'
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
  /** e.g. "downloading" | "importPending" | "importing" | "completed" | "failed" */
  trackedDownloadState?: string;
  title: string;
  seriesId?: number;
  episodeId?: number;
  seasonNumber?: number;
  downloadId?: string;
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
  private client: ReturnType<typeof createAxiosClient>

  constructor(baseUrl: string, apiKey: string) {
    const cleanUrl = baseUrl.replace(/\/$/, '')
    this.client = createAxiosClient({
      baseURL: `${cleanUrl}/api/v3`,
      headers: { 'X-Api-Key': apiKey },
      timeout: TIMEOUT.SONARR,
      retries: 2,
      serviceName: 'Sonarr',
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
      logger.error(`[Sonarr] Failed to send command ${name}:`, (e as Error).message)
      return { success: false, error: (e as Error).message }
    }
  }

  async getQueue() {
    const client = this.getClient()
    try {
      const response = await client.get('/queue', {
        params: {
          pageSize: 1000,
          includeUnknownSeriesItems: true,
          includeSeries: true,
          includeEpisode: true,
        }
      })
      return (response.data.records || response.data) as SonarrQueueItem[]
    } catch (e) {
      logger.error('[Sonarr] Failed to fetch queue:', (e as Error).message)
      return []
    }
  }

  /**
   * Supprime un item de la queue Sonarr.
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
      logger.info(`[Sonarr] Removed queue item ${queueItemId}`, options)
      return { success: true }
    } catch (e) {
      const errorMsg = (e as Error).message
      logger.error(`[Sonarr] Failed to remove queue item ${queueItemId}:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async getProfiles() {
    return cached('sonarr:profiles', async () => {
      const client = this.getClient()
      try {
        const response = await client.get('/qualityprofile')
        return response.data
      } catch (e) {
        logger.error('[Sonarr] Failed to fetch profiles:', (e as Error).message)
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['sonarr-static'] })
  }

  async getLanguageProfiles() {
    return cached('sonarr:languageprofiles', async () => {
      const client = this.getClient()
      try {
        const response = await client.get('/languageprofile')
        return response.data
      } catch (e) {
        logger.error('[Sonarr] Failed to fetch language profiles:', (e as Error).message)
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['sonarr-static'] })
  }

  async getSeries() {
    const client = this.getClient()
    try {
      const response = await client.get('/series')
      return response.data as SonarrSeries[]
    } catch (e) {
      logger.error('[Sonarr] Failed to fetch series:', (e as Error).message)
      return []
    }
  }

  async getRootFolders() {
    return cached('sonarr:rootfolders', async () => {
      const client = this.getClient()
      try {
        const response = await client.get('/rootfolder')
        return response.data
      } catch (e) {
        logger.error('[Sonarr] Failed to fetch root folders:', (e as Error).message)
        return []
      }
    }, { memoryTtl: CACHE_TTL.API_STATIC, tags: ['sonarr-static'] })
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
        } catch (e) {
          logger.error(`[Sonarr] Failed to fetch full series data for ${series.id}:`, (e as Error).message)
          // If 404, it means it's not actually in library despite ID? Unlikely, but safe to fallback or return null.
          // If the ID exists in lookup but not in /series/{id}, it might be a weird state.
          // But usually lookup returns id=0 or undefined if not in library.
        }
      }
      
      // If series.id is missing or 0, it means it's NOT in the library.
      // In this case, we should return NULL because getMediaAvailability checks for library presence.
      // If we return the lookup result, the system thinks it's in the library (but unmonitored/no files).
      
      return null
      
    } catch (e) {
      logger.error(`[Sonarr] Failed to lookup series ${tvdbId}:`, (e as Error).message)
      return null
    }
  }

  async lookupSeriesByTvdbId(tvdbId: number): Promise<SonarrSeries | null> {
    const client = this.getClient()
    if (!client) return null
    try {
      const response = await client.get('/series/lookup', {
        params: { term: `tvdb:${tvdbId}` }
      })
      if (!response.data || response.data.length === 0) {
        return null
      }
      return response.data[0] as SonarrSeries
    } catch (e) {
      logger.error(`[Sonarr] Failed to lookup series metadata ${tvdbId}:`, (e as Error).message)
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
    } catch (e) {
      logger.error(`[Sonarr] Failed to fetch episode files for series ${seriesId}:`, (e as Error).message)
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
      let lookupSeries: SonarrSeries | null = null

      if (!series || !series.id) {
        lookupSeries = await this.lookupSeriesByTvdbId(options.tvdbid)
      }

      if (series && series.id) {
        let seasonsChanged = false;
        const updatedSeasons = series.seasons.map((season: { seasonNumber: number; monitored: boolean }) => {
          const shouldMonitor = options.seasons?.includes(season.seasonNumber) ?? false
          if (season.monitored !== shouldMonitor) {
            seasonsChanged = true;
            return { ...season, monitored: shouldMonitor };
          }
          return season;
        });

        // Check if already monitored and no seasons changed
        if (series.monitored && !seasonsChanged) {
           return { success: true, message: 'Series already monitored', series }
        }

        // Update to monitored
        const updateData = {
          ...series,
          monitored: true,
          seasons: updatedSeasons
        }
        
        await client.put(`/series/${series.id}`, updateData)
        
        if (options.searchNow && seasonsChanged) {
            await this.sendCommand('SeriesSearch', { seriesId: series.id });
        }

        return { success: true, message: 'Series and seasons set to monitored', series: updateData }
      }

      // Add new series
      const seasonList = lookupSeries?.seasons || [];
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
        seasons: seasonList.length > 0 ? this.buildSeasonList(options.seasons || [], seasonList) : [],
        addOptions: {
          searchForMissingEpisodes: options.searchNow !== false
        }
      }

      const response = await client.post('/series', payload)
      return { success: true, series: response.data }

    } catch (e) {
      const err = e as { response?: { data?: Array<{ errorCode?: string }> | { message?: string } }; message?: string }
      const errorMsg = (err.response?.data as { message?: string })?.message || err.message
      if (!Array.isArray(err.response?.data) || (err.response?.data as Array<{ errorCode?: string }>)[0]?.errorCode !== 'SeriesExistsValidator') {
         logger.error(`[Sonarr] Failed to add series ${options.tvdbid}:`, JSON.stringify(err.response?.data || errorMsg))
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
    } catch (e) {
      logger.error(`[Sonarr] Failed to delete series ${seriesId}:`, (e as Error).message)
      return { success: false, error: (e as Error).message }
    }
  }

  async deleteEpisodeFile(episodeFileId: number) {
    const client = this.getClient()
    try {
      await client.delete(`/episodefile/${episodeFileId}`)
      return { success: true }
    } catch (e) {
      logger.error(`[Sonarr] Failed to delete episode file ${episodeFileId}:`, (e as Error).message)
      return { success: false, error: (e as Error).message }
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
    } catch (e) {
      logger.error(`[Sonarr] Failed to unmonitor season ${seasonNumber} for series ${seriesId}:`, (e as Error).message)
      return { success: false, error: (e as Error).message }
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
    } catch (e) {
      logger.error(`[Sonarr] Failed to monitor season ${seasonNumber} for ${tvdbId}:`, (e as Error).message)
      return { success: false, message: (e as Error).message }
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
      const episode = episodes.find((ep: { seasonNumber?: number; episodeNumber?: number }) => ep.seasonNumber === seasonNumber && ep.episodeNumber === episodeNumber)
      
      if (!episode) {
        return { success: false, message: 'Episode not found in Sonarr' }
      }

      if (episode.monitored) {
        return { success: true, message: 'Episode already monitored' }
      }

      episode.monitored = true
      await client.put(`/episode/${episode.id}`, episode)

      return { success: true }
    } catch (e) {
      logger.error(`[Sonarr] Failed to monitor episode S${seasonNumber}E${episodeNumber} for ${tvdbId}:`, (e as Error).message)
      return { success: false, message: (e as Error).message }
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
    } catch (e) {
      logger.error(`[Sonarr] Failed to unmonitor seasons for ${tvdbId}:`, (e as Error).message)
      return { success: false, message: (e as Error).message }
    }
  }

  async getEpisodes(seriesId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/episode', {
        params: { seriesId }
      })
      return response.data
    } catch (e) {
      logger.error(`[Sonarr] Failed to fetch episodes for series ${seriesId}:`, (e as Error).message)
      return []
    }
  }

  async getReleases(episodeId: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/release', { params: { episodeId } })
      return response.data
    } catch (e) {
      logger.error(`[Sonarr] Failed to fetch releases for episode ${episodeId}:`, (e as Error).message)
      return []
    }
  }

  async getSeasonReleases(seriesId: number, seasonNumber: number) {
    const client = this.getClient()
    try {
      const response = await client.get('/release', { params: { seriesId, seasonNumber } })
      return response.data
    } catch (e) {
      logger.error(`[Sonarr] Failed to fetch releases for series ${seriesId} season ${seasonNumber}:`, (e as Error).message)
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
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      const errorMsg = err.response?.data?.message || err.message
      logger.error(`[Sonarr] Failed to download release ${guid}:`, errorMsg)
      return { success: false, message: errorMsg }
    }
  }

  async pushRelease(release: Record<string, unknown>) {
    const client = this.getClient()
    try {
      const response = await client.post('/release/push', release)
      return { success: true, data: response.data }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      const errorMsg = err.response?.data?.message || err.message
      logger.error(`[Sonarr] Failed to push release:`, errorMsg)
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
      return response.data as unknown[] // Sonarr calendar returns episodes with series info
    } catch (e) {
      logger.error('[Sonarr] Failed to fetch calendar:', (e as Error).message)
      return []
    }
  }
}
