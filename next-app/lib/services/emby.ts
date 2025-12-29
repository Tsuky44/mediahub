import axios from 'axios'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'

export class EmbyService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  private async init() {
    if (!this.baseUrl) {
      this.baseUrl = await getSetting('emby_url')
      // Remove trailing slash and /web/... if present
      if (this.baseUrl) {
        this.baseUrl = this.baseUrl.split('/web/')[0].replace(/\/$/, '')
      }
    }
    if (!this.apiKey) {
      this.apiKey = await getSetting('emby_api_key')
    }
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Emby not configured')
    }
  }

  private async getClient() {
    await this.init()
    return axios.create({
      baseURL: this.baseUrl!,
      params: {
        api_key: this.apiKey
      },
      timeout: 30000
    })
  }

  async getSystemInfo() {
    const client = await this.getClient()
    const response = await client.get('/System/Info/Public')
    return response.data
  }

  async authenticate(username: string, pw: string) {
    await this.init()
    try {
        const response = await axios.post(`${this.baseUrl}/Users/AuthenticateByName`, {
            Username: username,
            Pw: pw
        }, {
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="NextApp", Device="NextApp", DeviceId="NextApp", Version="1.0.0"`
            }
        })
        return response.data
    } catch (e) {
        console.error('Emby authentication failed', e)
        return null
    }
  }

  async getUsers() {
    const client = await this.getClient()
    const response = await client.get('/Users')
    return response.data
  }

  async getSessions() {
    const client = await this.getClient()
    const response = await client.get('/Sessions')
    return response.data
  }

  async getUserPlayedItems(userId: string) {
    const client = await this.getClient()
    const response = await client.get(`/Users/${userId}/PlayedItems`, {
      params: {
        IncludeExternalContent: false,
        Limit: 5000
      }
    })
    return response.data
  }

  async getResumeItems(userId: string, limit: number = 4) {
    const client = await this.getClient()
    const response = await client.get(`/Users/${userId}/Items/Resume`, {
      params: {
        Limit: limit,
        Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData,SeriesInfo,ParentIndexNumber,IndexNumber,SeasonName,SeriesName,SeriesId'
      }
    })
    return response.data
  }

  async getRecentlyPlayedItems(userId: string, limit: number = 4) {
    // We use getUserItems with SortBy DatePlayed to get history
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
    const client = await this.getClient()
    const params = {
      IncludeExternalContent: false,
      Recursive: true,
      Fields: 'UserData,SeriesInfo',
      ...filters
    }
    const response = await client.get(`/Users/${userId}/Items`, { params })
    return response.data
  }

  async getItemDetails(itemId: string, userId?: string) {
    const client = await this.getClient()
    const url = userId ? `/Users/${userId}/Items/${itemId}` : `/Items/${itemId}`
    const response = await client.get(url, {
        params: {
            Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData'
        }
    })
    return response.data
  }

  async updateFavoriteStatus(userId: string, itemId: string, isFavorite: boolean) {
    const client = await this.getClient()
    const url = `/Users/${userId}/FavoriteItems/${itemId}`
    if (isFavorite) {
        await client.post(url)
    } else {
        await client.delete(url)
    }
  }

  async getItemByTmdbId(userId: string, tmdbId: number, type: 'Movie' | 'Series' | 'Episode') {
      // It seems Emby API filtering by ProviderId is tricky or not working as expected with the current version/setup.
      // And search term didn't work for ID.
      
      // Let's try to fetch all items of that type (if not too many) and filter manually.
      // This is a last resort but ensures correctness if the API doesn't support direct lookup well.
      // Assuming library size is manageable (e.g. < 5000 items).
      
      const allItems = await this.getUserItems(userId, {
          IncludeItemTypes: type,
          Recursive: true,
          Fields: 'UserData,ProviderIds',
          Limit: 1000 // Limit to avoid massive payloads, but might miss items in large libs
      })
      
      const match = allItems.Items?.find((i: any) => 
          (i.ProviderIds?.Tmdb && String(i.ProviderIds.Tmdb) === String(tmdbId))
      )
      
      return match || null
  }

  async toggleFavorite(userId: string, itemId: string, isFavorite: boolean) {
      const client = await this.getClient()
      const method = isFavorite ? 'post' : 'delete'
      const url = `/Users/${userId}/FavoriteItems/${itemId}`
      const response = await client.request({
          method,
          url
      })
      return response.data
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

  // Simplified version of getServerStats
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
            
            // Basic filtering logic (simplified from PHP)
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

export const embyService = new EmbyService()
