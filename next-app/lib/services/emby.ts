import axios from 'axios'
import https from 'https'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


export class EmbyService {
  private baseUrl: string
  private apiKey: string
  private httpsAgent: https.Agent

  /**
   * @param skipSslVerify - Si true (défaut), ignore les erreurs de certificat SSL (comportement historique).
   *                        Passer false pour activer la vérification stricte SSL.
   */
  constructor(baseUrl: string, apiKey: string, skipSslVerify: boolean = true) {
    // Remove trailing slash and /web/... if present
    this.baseUrl = baseUrl.split('/web/')[0].replace(/\/$/, '')
    this.apiKey = apiKey
    this.httpsAgent = new https.Agent({ rejectUnauthorized: !skipSslVerify })
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Emby configuration missing: URL or API Key is null')
    }
  }

  async getClient(timeout: number = 10000) {
    return axios.create({
      baseURL: this.baseUrl,
      params: {
        api_key: this.apiKey
      },
      timeout,
      httpsAgent: this.httpsAgent,
      maxRedirects: 5, // Allow some redirects
      validateStatus: (status) => status >= 200 && status < 400, // Allow 3xx
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Emby-Token': this.apiKey // Some proxies/Emby versions prefer this
      }
    })
  }

  async getLibraryStats() {
    try {
      const client = await this.getClient(5000)
      const response = await client.get('/Items/Counts')
      return response.data
    } catch (e) {
      error('[EmbyService] getLibraryStats failed:', e)
      return null
    }
  }

  async getSystemInfo() {
    try {
      const client = await this.getClient(5000)
      const response = await client.get('/System/Info/Public')
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        throw new Error('Received HTML instead of JSON (likely a redirect to login)')
      }
      return response.data
    } catch (e) {
      error(`[EmbyService] getSystemInfo failed at ${this.baseUrl}:`, (e as Error).message)
      return null
    }
  }

    async authenticate(username: string, pw: string) {
    log(`[EmbyService] Authenticating user '${username}' against ${this.baseUrl}`)
    
    const performAuth = async (url: string) => {
        const cleanUsername = username.trim();
        return await axios.post(`${url}/Users/AuthenticateByName`, {
            Username: cleanUsername,
            Pw: pw
        }, {
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="MediaHub", Device="Web Browser", DeviceId="browser-${Math.random().toString(36).substring(7)}", Version="1.0.0"`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            httpsAgent: this.httpsAgent,
            timeout: 15000, // 15s timeout
            maxRedirects: 5
        })
    }

    try {
        const response = await performAuth(this.baseUrl);
        log(`[EmbyService] Auth success for ${username}`)
        return response.data
    } catch (e) {
        // Auto-retry with host.docker.internal if localhost fails (Docker on Windows/Mac fix)
        if ((this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) && 
            ((e as { code?: string }).code === 'ECONNREFUSED' || (e as { code?: string }).code === 'ETIMEDOUT' || (e as { code?: string }).code === 'EHOSTUNREACH')) {
            
            warn(`[EmbyService] Connection to ${this.baseUrl} failed (${(e as { code?: string }).code}). Retrying with host.docker.internal...`)
            try {
                const newUrl = this.baseUrl.replace(/localhost|127\.0\.0\.1/g, 'host.docker.internal');
                const response = await performAuth(newUrl);
                log(`[EmbyService] Auth success using host.docker.internal`)
                return response.data
            } catch (retryError) {
                error(`[EmbyService] Retry failed:`, (retryError as Error).message)
            }
        }

        const errorStatus = (e as { response?: { status?: number } }).response?.status
        const errorData = (e as { response?: { data?: unknown } }).response?.data
        error(`[EmbyService] Auth failed for ${username} (Status: ${errorStatus}):`, errorData || (e as Error).message)
        
        if (errorStatus === 401) {
            throw new Error("Identifiants incorrects sur Emby")
        }
        throw new Error(`Erreur Emby (${errorStatus || (e as { code?: string }).code || 'Unknown'}): ${(e as Error).message}`)
    }
  }

  async getUsers() {
    const client = await this.getClient(10000)
    const response = await client.get('/Users')
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      throw new Error('Received HTML instead of JSON')
    }
    
    if (Array.isArray(response.data)) {
      return response.data
    }
    
    // Handle { Items: [...] } response format (possible in some versions)
    if (response.data && Array.isArray(response.data.Items)) {
      return response.data.Items
    }

    return []
  }

  async getSessions() {
    try {
      const client = await this.getClient(3000)
      const response = await client.get('/Sessions')
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        throw new Error('Received HTML instead of JSON')
      }
      return response.data
    } catch (e) {
      error(`[EmbyService] getSessions failed at ${this.baseUrl}:`, (e as Error).message)
      return []
    }
  }

  async getInstalledPlugins() {
    try {
      const client = await this.getClient(5000)
      const response = await client.get('/Plugins')
      return response.data
    } catch (e) {
      error('[EmbyService] getInstalledPlugins failed:', e)
      return []
    }
  }

  async getItemsDetails(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) return []
    try {
      const client = await this.getClient(10000)
      const response = await client.get('/Items', {
        params: {
          Ids: itemIds.join(','),
          Fields: 'ProviderIds,RunTimeTicks,SeriesId,SeriesName,SeasonName,IndexNumber,ParentIndexNumber,Type'
        }
      })
      return response.data.Items || []
    } catch (e) {
      error('[EmbyService] getItemsDetails failed:', e)
      return []
    }
  }

  async getItemsDurations(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) return {}
    try {
      const client = await this.getClient(5000)
      const response = await client.get('/Items', {
        params: {
          Ids: itemIds.join(','),
          Fields: 'RunTimeTicks'
        }
      })
      
      const durations: Record<string, number> = {}
      if (response.data && response.data.Items) {
        response.data.Items.forEach((item: Record<string, unknown>) => {
          const rt = item.RunTimeTicks as number | undefined
          const id = item.Id as string | undefined
          if (rt && id) {
            durations[id] = rt / 10000000
          }
        })
      }
      return durations
    } catch (e) {
      error('[EmbyService] getItemsDurations failed:', e)
      return {}
    }
  }

  async getPlaybackReport(params: Record<string, unknown> = {}) {
    try {
      const client = await this.getClient()
      const response = await client.get('/PlaybackReporting/Report', { params })
      return response.data
    } catch (e) {
      if ((e as { response?: { status?: number } }).response?.status === 404) {
        // Fallback to ActivityLog if Report is not available
        try {
          const response = await (await this.getClient()).get('/PlaybackReporting/ActivityLog', {
            params: {
              StartIndex: params.startIndex || 0,
              Limit: params.pageSize || params.limit || 2000,
              MinDate: params.minDate,
            }
          })
          return response.data
        } catch (e2) {
          error(`[EmbyService] getPlaybackReport ActivityLog fallback failed:`, (e2 as Error).message)
          throw e2
        }
      }
      error(`[EmbyService] getPlaybackReport failed:`, (e as Error).message)
      throw e
    }
  }

  async getCustomQuery(query: string) {
    try {
      const client = await this.getClient()
      const response = await client.post('/user_usage_stats/submit_custom_query', {
        CustomQueryString: query
      })
      return response.data
    } catch (e) {
      error(`[EmbyService] getCustomQuery failed:`, (e as Error).message)
      throw e
    }
  }

  async createUser(name: string, connectUserName?: string) {
    try {
        const client = await this.getClient(10000)
        const payload: Record<string, unknown> = { Name: name }
        // Some Emby versions might accept this on creation
        if (connectUserName) {
            payload.ConnectUserName = connectUserName
        }
        const response = await client.post('/Users/New', payload)
        return response.data
    } catch (e) {
        const errResponse = (e as { response?: { data?: unknown } }).response
        const errorDetails = errResponse?.data ? JSON.stringify(errResponse.data) : (e as Error).message
        error(`[EmbyService] Failed to create user ${name}:`, errorDetails)
        throw new Error(`${(e as Error).message} ${errorDetails !== (e as Error).message ? `(${errorDetails})` : ''}`)
    }
  }

  async getUser(id: string) {
    try {
        const client = await this.getClient(5000)
        const response = await client.get(`/Users/${id}`)
        return response.data
    } catch (e) {
        error(`[EmbyService] Failed to get user ${id}:`, (e as Error).message)
        throw new Error(`Erreur lors de la récupération de l'utilisateur Emby: ${(e as Error).message}`)
    }
  }

  async linkUserToConnect(id: string, connectUsername: string) {
    try {
        const client = await this.getClient(5000)
        // Try sending with empty body object instead of null
        // And ensure param is passed correctly
        await client.post(`/Users/${id}/Connect/Link`, {}, {
            params: {
                ConnectUsername: connectUsername
            }
        })
    } catch (e) {
        // Fallback: Try sending in body if query param failed (some versions differ)
        try {
            const client = await this.getClient(5000)
            await client.post(`/Users/${id}/Connect/Link`, {
                ConnectUsername: connectUsername
            })
        } catch (retryError) {
            error(`[EmbyService] Failed to link user ${id} to Connect:`, (e as Error).message)
            throw new Error(`Erreur lors de la liaison Emby Connect: ${(e as Error).message}`)
        }
    }
  }

  async updateUserPolicy(id: string, policy: Record<string, unknown>) {
    try {
        const client = await this.getClient(5000)
        await client.post(`/Users/${id}/Policy`, policy)
    } catch (e) {
        error(`[EmbyService] Failed to update policy for user ${id}:`, (e as Error).message)
        throw new Error(`Erreur lors de la mise à jour des droits Emby: ${(e as Error).message}`)
    }
  }

  async updateUserConfiguration(id: string, config: Record<string, unknown>) {
    try {
        const client = await this.getClient(5000)
        await client.post(`/Users/${id}/Configuration`, config)
    } catch (e) {
        error(`[EmbyService] Failed to update configuration for user ${id}:`, (e as Error).message)
        throw new Error(`Erreur lors de la mise à jour de la configuration Emby: ${(e as Error).message}`)
    }
  }
  
  async updateUser(user: Record<string, unknown>) {
    try {
        const client = await this.getClient(5000)
        // Emby updates user details via POST /Users/{Id}
        await client.post(`/Users/${String(user.Id)}`, user)
    } catch (e) {
        error(`[EmbyService] Failed to update user ${String(user.Id)}:`, (e as Error).message)
        throw new Error(`Erreur lors de la mise à jour de l'utilisateur Emby: ${(e as Error).message}`)
    }
  }

  getItemImageUrl(itemId: string, width: number = 400) {
    return `${this.baseUrl}/Items/${itemId}/Images/Primary?width=${width}&quality=90`
  }

  async getPublicItems(limit: number = 20) {
    try {
      const users = await this.getUsers()
      if (users.length === 0) return []
      
      const client = await this.getClient()
      const response = await client.get(`/Users/${users[0].Id}/Items`, {
        params: {
          SortBy: 'Random',
          IncludeItemTypes: 'Movie,Series',
          Recursive: true,
          Fields: 'ProviderIds,RunTimeTicks',
          Limit: limit,
          HasBackdrop: true
        }
      })
      return response.data.Items || []
    } catch (e) {
      error('[EmbyService] getPublicItems failed:', e)
      return []
    }
  }

  async getUserPlayedItems(userId: string) {
    const client = await this.getClient()
    try {
        const response = await client.get(`/Users/${userId}/Items`, {
            params: {
                Recursive: true,
                IsPlayed: true,
                SortBy: 'DatePlayed',
                SortOrder: 'Descending',
                IncludeItemTypes: 'Movie,Episode',
                Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData',
                Limit: 500
            }
        })
        return response.data
    } catch (e) {
        error(`[EmbyService] Failed to get played items for user ${userId}:`, e)
        return { Items: [] }
    }
  }

  async getResumeItems(userId: string, limit: number = 4) {
    try {
      const client = await this.getClient(5000)
      const response = await client.get(`/Users/${userId}/Items/Resume`, {
        params: {
          Limit: limit,
          Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData,SeriesInfo,ParentIndexNumber,IndexNumber,SeasonName,SeriesName,SeriesId'
        }
      })
      return response.data
    } catch (e) {
      error('[EmbyService] getResumeItems failed:', e)
      return { Items: [] }
    }
  }

  async getRecentlyPlayedItems(userId: string, limit: number = 4) {
    return this.getUserItems(userId, {
        SortBy: 'DatePlayed',
        SortOrder: 'Descending',
        Filters: 'IsPlayed',
        Limit: limit,
        Recursive: true,
        IncludeItemTypes: 'Movie,Episode',
        Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData,SeriesInfo,ParentIndexNumber,IndexNumber,SeasonName,SeriesName,SeriesId'
    })
  }

  async getUserItems(userId: string, filters: any = {}) {
    try {
      const client = await this.getClient(4000)
      const params = {
        IncludeExternalContent: false,
        Recursive: true,
        Fields: 'UserData,SeriesInfo',
        ...filters
      }
      const response = await client.get(`/Users/${userId}/Items`, { params })
      return response.data
    } catch (e) {
      error('[EmbyService] getUserItems failed:', e)
      return { Items: [] }
    }
  }

  async getItemDetails(itemId: string, userId?: string) {
    try {
      const client = await this.getClient(3000)
      const url = userId ? `/Users/${userId}/Items/${itemId}` : `/Items/${itemId}`
      const response = await client.get(url, {
          params: {
              Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData'
          }
      })
      return response.data
    } catch (e) {
      error('[EmbyService] getItemDetails failed:', e)
      return null
    }
  }

  async updateFavoriteStatus(userId: string, itemId: string, isFavorite: boolean) {
    try {
      const client = await this.getClient()
      const url = `/Users/${userId}/FavoriteItems/${itemId}`
      if (isFavorite) {
          await client.post(url)
      } else {
          await client.delete(url)
      }
    } catch (e) {
      error('[EmbyService] updateFavoriteStatus failed:', e)
    }
  }

  async getItemByTmdbId(userId: string, tmdbId: number, type: 'Movie' | 'Series' | 'Episode') {
      const allItems = await this.getUserItems(userId, {
          IncludeItemTypes: type,
          Recursive: true,
          Fields: 'UserData,ProviderIds',
          Limit: 1000
      })
      
      const match = allItems.Items?.find((i: Record<string, unknown>) => {
          const providerIds = i.ProviderIds as Record<string, string> | undefined
          return providerIds?.Tmdb && String(providerIds.Tmdb) === String(tmdbId)
      })
      
      return match || null
  }

  async toggleFavorite(userId: string, itemId: string, isFavorite: boolean) {
      try {
        const client = await this.getClient()
        const method = isFavorite ? 'post' : 'delete'
        const url = `/Users/${userId}/FavoriteItems/${itemId}`
        const response = await client.request({
            method,
            url
        })
        return response.data
      } catch (e) {
        error('[EmbyService] toggleFavorite failed:', e)
        return null
      }
  }

  async getEpisodes(userId: string, seriesId: string, seasonNumber?: number) {
      const filters: Record<string, unknown> = {
          ParentId: seriesId,
          IncludeItemTypes: 'Episode',
          Recursive: true,
          Fields: 'UserData,ProviderIds,Overview'
      }
      
      if (seasonNumber !== undefined) {
          filters.ParentIndexNumber = seasonNumber
      }

      const items = await this.getUserItems(userId, filters)
      return items.Items || []
  }

  async getStorageItems() {
    try {
      const client = await this.getClient(30000) // Long timeout for large libraries
      // Fetch Movies and Episodes
      // We need SeriesName and SeriesId for Episodes to group them
      const response = await client.get('/Items', {
        params: {
          Recursive: true,
          IncludeItemTypes: 'Movie,Episode,Series',
          Fields: 'Path,MediaSources,ProviderIds,SeriesId,SeriesName,DateCreated,ParentId',
          SortBy: 'DateCreated',
          SortOrder: 'Descending',
          IsVirtualItem: false // Exclude virtual items
        }
      })
      
      return response.data.Items || []
    } catch (e) {
      error('[EmbyService] getStorageItems failed:', e)
      return []
    }
  }

  async deleteItem(itemId: string) {
    try {
      const client = await this.getClient()
      await client.delete(`/Items/${itemId}`)
      return true
    } catch (e) {
      error(`[EmbyService] deleteItem failed for ${itemId}:`, (e as Error).message)
      throw e
    }
  }

  async refreshItem(itemId: string) {
    try {
      const client = await this.getClient()
      await client.post(`/Items/${itemId}/Refresh`, null, {
        params: {
          Recursive: true,
          ImageRefreshMode: 'Default',
          MetadataRefreshMode: 'Default',
          ReplaceAllImages: false,
          ReplaceAllMetadata: false
        }
      })
      return true
    } catch (e) {
      error(`[EmbyService] refreshItem failed for ${itemId}:`, (e as Error).message)
      return false
    }
  }

  async deleteEpisodesBySeasonNumber(seriesId: string, seasonNumber: number) {
    try {
      const client = await this.getClient()
      const response = await client.get('/Items', {
        params: {
          ParentId: seriesId,
          IncludeItemTypes: 'Episode',
          Recursive: true,
          Fields: 'ParentIndexNumber'
        }
      })
      
      const episodes = response.data.Items || []
      // Filter strictly by season number
      const targetEpisodes = episodes.filter((ep: Record<string, unknown>) => (ep as { ParentIndexNumber?: number }).ParentIndexNumber === seasonNumber)
      
      log(`[EmbyService] Deleting ${targetEpisodes.length} episodes for Season ${seasonNumber} of Series ${seriesId}`)
      
      // Delete in parallel chunks to speed up
      const chunkSize = 5
      for (let i = 0; i < targetEpisodes.length; i += chunkSize) {
        const chunk = targetEpisodes.slice(i, i + chunkSize)
        await Promise.all(chunk.map((ep: Record<string, unknown>) => this.deleteItem(String(ep.Id))))
      }
      
      return true
    } catch (e) {
      error(`[EmbyService] deleteEpisodesBySeasonNumber failed:`, (e as Error).message)
      return false
    }
  }

  async getItemStateForAllUsers(itemId: string) {
    try {
      const users = await this.getUsers()
      
      // Run in parallel
      const promises = users.map(async (user: Record<string, unknown>) => {
        try {
            const item = await this.getItemDetails(itemId, String(user.Id))
            
            if (!item) return null

            let stat: Record<string, unknown> | null = null

            if (item.Type === 'Series') {
                // Fetch all episodes for this user to get accurate stats
                const client = await this.getClient()
                const episodesRes = await client.get(`/Users/${String(user.Id)}/Items`, {
                    params: {
                        ParentId: itemId,
                        Recursive: true,
                        IncludeItemTypes: 'Episode',
                        Fields: 'UserData,ParentIndexNumber,IndexNumber,RunTimeTicks'
                    }
                })
                
                const episodes = episodesRes.data.Items || []
                if (episodes.length === 0) return null

                let playedCount = 0
                let totalDuration = 0
                let playedDuration = 0
                let lastPlayedDate: Date | null = null
                
                // Fallback to Series LastPlayedDate
                if (item.UserData?.LastPlayedDate) {
                     const d = new Date(item.UserData.LastPlayedDate)
                     if (!isNaN(d.getTime())) {
                         lastPlayedDate = d
                     }
                }

                let lastPlayedEpisode: any = null
                
                const seasonStats = new Map<number, { total: number, played: number }>()

                for (const ep of episodes) {
                    // Season Stats
                    const seasonNum = ep.ParentIndexNumber ?? 0
                    if (!seasonStats.has(seasonNum)) {
                        seasonStats.set(seasonNum, { total: 0, played: 0 })
                    }
                    const sStat = seasonStats.get(seasonNum)!
                    sStat.total++

                    // Global Stats
                    if (ep.RunTimeTicks) totalDuration += ep.RunTimeTicks

                    if (ep.UserData?.Played) {
                        playedCount++
                        sStat.played++
                        if (ep.RunTimeTicks) playedDuration += ep.RunTimeTicks
                    } else if (ep.UserData?.PlaybackPositionTicks) {
                         if (ep.RunTimeTicks) playedDuration += ep.UserData.PlaybackPositionTicks
                    }

                    // Last Played
                    if (ep.UserData?.LastPlayedDate) {
                        const d = new Date(ep.UserData.LastPlayedDate)
                        if (!isNaN(d.getTime())) {
                            if (!lastPlayedDate || d >= lastPlayedDate) {
                                lastPlayedDate = d
                                lastPlayedEpisode = ep
                            }
                        }
                    }
                }

                // If user hasn't watched anything, we might skip them or show 0%
                // The user wants to know "si des personne sont entrain de regarder".
                // So if playedCount > 0 or lastPlayedDate exists, we include them.
                if (playedCount > 0 || lastPlayedDate) {
                    const globalPercentage = episodes.length > 0 ? (playedCount / episodes.length) * 100 : 0
                    
                    const seasons = Array.from(seasonStats.entries()).map(([seasonNumber, stats]) => ({
                        seasonNumber,
                        total: stats.total,
                        played: stats.played,
                        percentage: stats.total > 0 ? (stats.played / stats.total) * 100 : 0
                    })).sort((a, b) => a.seasonNumber - b.seasonNumber)

                    stat = {
                        userId: user.Id,
                        userName: user.Name,
                        played: playedCount === episodes.length,
                        lastPlayedDate: lastPlayedDate ? lastPlayedDate.toISOString() : null,
                        playbackPositionTicks: 0, // Not relevant for Series global
                        totalDurationTicks: totalDuration,
                        percentage: globalPercentage,
                        episodeText: lastPlayedEpisode ? `Dernier : S${lastPlayedEpisode.ParentIndexNumber}E${lastPlayedEpisode.IndexNumber}` : `${playedCount}/${episodes.length} épisodes`,
                        seasons: seasons,
                        playedEpisodes: playedCount,
                        totalEpisodes: episodes.length,
                        episodeIds: episodes.map((e: any) => e.Id)
                    }
                }

            } else {
                // Movie or Episode
                if (item.UserData && (item.UserData.Played || item.UserData.PlaybackPositionTicks > 0)) {
                    stat = {
                        userId: user.Id,
                        userName: user.Name,
                        played: item.UserData.Played,
                        lastPlayedDate: item.UserData.LastPlayedDate,
                        playbackPositionTicks: item.UserData.PlaybackPositionTicks,
                        totalDurationTicks: item.RunTimeTicks,
                        percentage: item.RunTimeTicks ? (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100 : 0,
                        episodeText: ''
                    }
                }
            }

            return stat
        } catch (e) {
            return null
        }
      })

      const results = await Promise.all(promises)
      return results.filter(r => r !== null)

    } catch (e) {
      error(`[EmbyService] getItemStateForAllUsers failed for ${itemId}:`, (e as Error).message)
      return []
    }
  }

  async getSeasonDetails(seriesId: string) {
    try {
      const client = await this.getClient()
      // Get seasons
      const response = await client.get(`/Items`, {
        params: {
          ParentId: seriesId,
          IncludeItemTypes: 'Season',
          Fields: 'Path,ProviderIds,MediaSources'
        }
      })
      
      const seasons = response.data.Items || []
      
      // For each season, we might want size. But size is usually on Episodes.
      // So we need to fetch episodes for each season or all episodes for series and group.
      // Fetching all episodes is better.
      const episodesResponse = await client.get(`/Items`, {
        params: {
            ParentId: seriesId,
            IncludeItemTypes: 'Episode',
            Recursive: true,
            Fields: 'Path,MediaSources,ProviderIds,SeasonId,SeasonName,ParentIndexNumber'
        }
      })

      const episodes = episodesResponse.data.Items || []
      
      // Group episodes by season
      const seasonsMap = new Map<string, any>()
      
      // Initialize seasons from season items
      seasons.forEach((s: any) => {
          seasonsMap.set(s.Id, {
              id: s.Id,
              name: s.Name,
              index: s.IndexNumber,
              size: 0,
              episodesCount: 0,
              path: s.Path
          })
      })
      
      episodes.forEach((ep: any) => {
          const seasonId = ep.SeasonId
          let season = seasonsMap.get(seasonId)
          
          if (!season) {
              // Create virtual season if not found (e.g. Specials sometimes)
              season = {
                  id: seasonId,
                  name: ep.SeasonName || `Saison ${ep.ParentIndexNumber}`,
                  index: ep.ParentIndexNumber,
                  size: 0,
                  episodesCount: 0,
                  path: '' // Episode path might be different
              }
              seasonsMap.set(seasonId, season)
          }
          
          let size = 0
          if (ep.MediaSources && ep.MediaSources.length > 0) {
              size = ep.MediaSources.reduce((acc: number, src: Record<string, unknown>) => acc + ((src as { Size?: number }).Size || 0), 0)
          }
          
          season.size += size
          season.episodesCount += 1
      })
      
      return Array.from(seasonsMap.values()).sort((a, b) => a.index - b.index)
      
    } catch (e) {
       error(`[EmbyService] getSeasonDetails failed for ${seriesId}:`, (e as Error).message)
       return []
    }
  }

  async getPlaybackReportingStats(days: number = 30) {
    const client = await this.getClient()
    try {
        // 0. Try custom query on PlaybackActivity table first (if Statistics plugin is present but we want Playback Reporting data)
        // Some users have both, but we want the data from Playback Reporting's DB structure
        try {
            let query = `SELECT rowid, * FROM PlaybackActivity`
            
            if (days > 0) {
                const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                // Format for SQLite comparison (YYYY-MM-DD HH:mm:ss)
                const formattedDate = minDate.toISOString().replace('T', ' ').split('.')[0]
                query += ` WHERE DateCreated > '${formattedDate}'`
            }
            
            query += ` ORDER BY DateCreated DESC`

            log(`[EmbyService] Executing custom query: ${query}`)

            const pbQueryResponse = await client.post('/user_usage_stats/submit_custom_query', {
                CustomQueryString: query
            })
            if (pbQueryResponse.data && pbQueryResponse.data.results && pbQueryResponse.data.results.length > 0) {
                log(`[EmbyService] Custom query returned ${pbQueryResponse.data.results.length} rows`)
                return pbQueryResponse.data.results.map((item: any[]) => ({
                    Id: item[0],
                    DateCreated: item[1],
                    UserId: item[2],
                    ItemId: item[3],
                    ItemType: item[4],
                    ItemName: item[5],
                    PlaybackMethod: item[6],
                    ClientName: item[7],
                    DeviceName: item[8],
                    PlayDuration: item[9],
                    UserName: 'Unknown',
                    App: item[7],
                    Device: item[8]
                }))
            }
        } catch (e) {
            // Ignore custom query error and continue to official endpoints
            warn('[EmbyService] Custom query failed, falling back to endpoints:', (e as any).message)
        }

        // 1. Try the Report endpoint
        const reportResponse = await client.get('/PlaybackReporting/Report', {
            params: {
                MinDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                // Grouping by Id (rowid) ensures we get individual sessions
                GroupBy: 'Id'
            }
        })
        
        if (reportResponse.data && reportResponse.data.Items) {
            return reportResponse.data.Items
        }

        // Fallback to ActivityLog
        const response = await client.get('/PlaybackReporting/ActivityLog', {
            params: {
                MinDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                IsIntermediate: false,
                StartIndex: 0,
                Limit: 10000
            }
        })
        
        return response.data?.Items || []
    } catch (e) {
        if ((e as { response?: { status?: number } }).response?.status === 404) {
            // Plugin not installed, just return empty list
            return []
        }
        warn('[EmbyService] Playback Reporting plugin error:', (e as Error).message)
        return []
    }
  }

  async getStatisticsStats(days: number = 2) {
        // NOTE: This method now falls back to Playback Reporting as the primary source
        // since we are moving away from the Statistics plugin.
        const pbStats = await this.getPlaybackReportingStats(days);
        if (pbStats && pbStats.length > 0) {
            return pbStats;
        }

        const client = await this.getClient()
        try {
            // Fallback to the old Statistics plugin custom query if Playback Reporting fails
            let query = `SELECT rowid, * FROM PlaybackActivity`
            
            if (days > 0) {
                const minDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                const formattedDate = minDate.toISOString().replace('T', ' ').split('.')[0] // YYYY-MM-DD HH:mm:ss
                query += ` WHERE DateCreated > '${formattedDate}'`
            }
            
            query += ` ORDER BY DateCreated DESC`
            
            const response = await client.post('/user_usage_stats/submit_custom_query', {
                CustomQueryString: query
            })
        
        if (response.data && response.data.results) {
            // Map the array of arrays to objects
            // Mapping for user_usage_stats plugin: 
            // 0:rowid, 1:DateCreated, 2:UserId, 3:ItemId, 4:ItemType, 5:ItemName, 6:PlaybackMethod, 7:ClientName, 8:DeviceName, 9:PlayDuration
            return response.data.results.map((item: any[]) => ({
                Id: item[0],
                DateCreated: item[1],
                UserId: item[2],
                ItemId: item[3],
                ItemType: item[4],
                ItemName: item[5],
                PlaybackMethod: item[6],
                ClientName: item[7],
                DeviceName: item[8],
                PlayDuration: item[9],
                // Compatibility fields for the tracker
                UserName: 'Unknown', // Statistics plugin doesn't seem to return username in this table
                App: item[7],
                Device: item[8]
            }))
        }
        
        return []
    } catch (e) {
        if ((e as { response?: { status?: number } }).response?.status === 404) {
            return []
        }
        warn('[EmbyService] Statistics plugin error:', (e as Error).message)
        return []
    }
  }

  async getServerStats(from?: string, to?: string) {
    const users = await this.getUsers()
    
    let totalMinutes = 0
    let totalPlays = 0
    const userMinutes: Record<string, number> = {}
    const topMovies: Record<string, number> = {}
    const topSeries: Record<string, number> = {}

    for (const user of users) {
      try {
        const userId = user.Id
        const itemsResponse = await this.getUserPlayedItems(userId)
        const items = itemsResponse.Items || []

        for (const item of items) {
            const type = item.Type
            const runTimeTicks = item.RunTimeTicks || 0
            const minutes = (runTimeTicks / 600000000) || 0
            const userData = item.UserData || {}
            const playCount = userData.PlayCount || 0
            
            const effectivePlays = Math.max(1, playCount)
            const minutesTotal = minutes * effectivePlays

            totalMinutes += minutesTotal
            totalPlays += effectivePlays
            
            userMinutes[userId] = (userMinutes[userId] || 0) + minutesTotal

            const name = item.Name || 'Unknown'
            const seriesName = item.SeriesName || 'Unknown'

            if (type === 'Movie') {
                topMovies[name] = (topMovies[name] || 0) + minutesTotal
            } else if (type === 'Episode') {
                topSeries[seriesName] = (topSeries[seriesName] || 0) + minutesTotal
            }
        }
      } catch (e) {
        error(`Failed to fetch stats for user ${String(user.Id)}`, e)
      }
    }

    return {
        overview: {
            totalMinutes: Math.round(totalMinutes),
            totalHours: Math.round(totalMinutes / 60),
            totalPlays,
            activeUsers: Object.keys(userMinutes).length
        },
        top: {
            movies: Object.entries(topMovies)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) })),
            series: Object.entries(topSeries)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([name, minutes]) => ({ name, minutes: Math.round(minutes) }))
        }
    }
  }
}
