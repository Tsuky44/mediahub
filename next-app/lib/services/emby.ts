import axios from 'axios'
import https from 'https'

export class EmbyService {
  private baseUrl: string
  private apiKey: string
  private httpsAgent = new https.Agent({
    rejectUnauthorized: false
  })

  constructor(baseUrl: string, apiKey: string) {
    // Remove trailing slash and /web/... if present
    this.baseUrl = baseUrl.split('/web/')[0].replace(/\/$/, '')
    this.apiKey = apiKey
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Emby configuration missing: URL or API Key is null')
    }
  }

  private async getClient(timeout: number = 10000) {
    return axios.create({
      baseURL: this.baseUrl,
      params: {
        api_key: this.apiKey
      },
      timeout,
      httpsAgent: this.httpsAgent,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }

  async getSystemInfo() {
    try {
      const client = await this.getClient(5000)
      const response = await client.get('/System/Info/Public')
      return response.data
    } catch (e) {
      console.error('[EmbyService] getSystemInfo failed:', e)
      return null
    }
  }

  async authenticate(username: string, pw: string) {
    console.log(`[EmbyService] Authenticating user '${username}' against ${this.baseUrl}`)
    try {
        const response = await axios.post(`${this.baseUrl}/Users/AuthenticateByName`, {
            Username: username,
            Pw: pw
        }, {
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="Emby-App", Device="Web", DeviceId="12345", Version="1.0.0"`,
                'Content-Type': 'application/json'
            },
            httpsAgent: this.httpsAgent,
            timeout: 10000
        })
        return response.data
    } catch (e: any) {
        const errorMsg = e.response?.data ? JSON.stringify(e.response.data) : e.message
        console.error(`[EmbyService] Auth failed for ${username} at ${this.baseUrl}:`, errorMsg)
        throw new Error(`Emby Auth Error: ${errorMsg} (URL: ${this.baseUrl})`)
    }
  }

  async getUsers() {
    try {
      const client = await this.getClient(10000)
      const response = await client.get('/Users')
      return response.data
    } catch (e) {
      console.error('[EmbyService] getUsers failed:', e)
      return []
    }
  }

  async getSessions() {
    try {
      const client = await this.getClient(3000)
      const response = await client.get('/Sessions')
      return response.data
    } catch (e) {
      console.error('[EmbyService] getSessions failed:', e)
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
        response.data.Items.forEach((item: any) => {
          if (item.RunTimeTicks) {
            durations[item.Id] = item.RunTimeTicks / 10000000
          }
        })
      }
      return durations
    } catch (e) {
      console.error('[EmbyService] getItemsDurations failed:', e)
      return {}
    }
  }

  getItemImageUrl(itemId: string, type: string = 'Primary') {
    return `${this.baseUrl}/Items/${itemId}/Images/${type}?api_key=${this.apiKey}`
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
      console.error('[EmbyService] getPublicItems failed:', e)
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
        console.error(`[EmbyService] Failed to get played items for user ${userId}:`, e)
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
      console.error('[EmbyService] getResumeItems failed:', e)
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
      console.error('[EmbyService] getUserItems failed:', e)
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
      console.error('[EmbyService] getItemDetails failed:', e)
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
      console.error('[EmbyService] updateFavoriteStatus failed:', e)
    }
  }

  async getItemByTmdbId(userId: string, tmdbId: number, type: 'Movie' | 'Series' | 'Episode') {
      const allItems = await this.getUserItems(userId, {
          IncludeItemTypes: type,
          Recursive: true,
          Fields: 'UserData,ProviderIds',
          Limit: 1000
      })
      
      const match = allItems.Items?.find((i: any) => 
          (i.ProviderIds?.Tmdb && String(i.ProviderIds.Tmdb) === String(tmdbId))
      )
      
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
        console.error('[EmbyService] toggleFavorite failed:', e)
        return null
      }
  }

  async getEpisodes(userId: string, seriesId: string, seasonNumber?: number) {
      const filters: any = {
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

  async getPlaybackReportingStats(days: number = 30) {
    const client = await this.getClient()
    try {
        const response = await client.get('/PlaybackReporting/ActivityLog', {
            params: {
                MinDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                IsIntermediate: false,
                UserId: '',
                StartIndex: 0,
                Limit: 10000
            }
        })
        
        if (!response.data || !response.data.Items) {
            const reportResponse = await client.get('/PlaybackReporting/Report', {
                params: {
                    MinDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                }
            })
            return reportResponse.data.Items || reportResponse.data
        }

        return response.data.Items
    } catch (e) {
        console.warn('[EmbyService] Playback Reporting plugin error:', e)
        try {
            const queryResponse = await client.get('/PlaybackReporting/Query')
            return queryResponse.data.Items || queryResponse.data
        } catch (e2) {
            return null
        }
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
        console.error(`Failed to fetch stats for user ${user.Id}`, e)
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
