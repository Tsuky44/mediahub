import axios from 'axios'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { remember } from '@/lib/cache'

export class JellyseerrService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  private async init() {
    if (!this.baseUrl) {
      this.baseUrl = await getSetting('jellyseerr_url')
      if (this.baseUrl) {
        this.baseUrl = this.baseUrl.replace(/\/$/, '')
      }
    }
    if (!this.apiKey) {
      this.apiKey = await getSetting('jellyseerr_api_key')
    }
    
    if (!this.baseUrl || !this.apiKey) {
        // Warn but don't throw immediately to allow graceful fallback
        console.warn('Jellyseerr not configured')
        return false
    }
    return true
  }

  private async getClient() {
    const configured = await this.init()
    if (!configured) return null

    return axios.create({
      baseURL: this.baseUrl!,
      headers: {
        'X-Api-Key': this.apiKey
      },
      timeout: 10000
    })
  }

  async getRequests(take = 20, skip = 0) {
    const client = await this.getClient()
    if (!client) return { results: [], total: 0 }

    try {
        const response = await client.get('/api/v1/request', {
            params: {
                take,
                skip,
                sort: 'added',
            }
        })
        
        // Log to debug the structure if needed, but looking at API docs/standard responses:
        // response.data.results array contains objects.
        // Each object usually has 'media' property.
        // 'media' property has 'tmdbId', 'status', etc.
        // BUT the title might be on 'media' or at the root if it's joined.
        // Actually, Jellyseerr /request endpoint returns:
        // { results: [ { id: 1, type: 'movie', media: { tmdbId: 123, status: 5 }, ... } ] }
        // The title/name is usually fetched via ?include=media or similar, OR it's in the media object if enriched.
        // Wait, the standard /request endpoint MIGHT NOT include the full TMDB details (title, overview, images) by default 
        // unless the 'media' relation is fully populated with metadata.
        // However, typically 'media' in Jellyseerr database just stores IDs and status.
        // The actual title usually comes from a join or we might need to fetch it from TMDB if it's missing.
        // Let's check what we are actually receiving.
        if (response.data.results && response.data.results.length > 0) {
            console.log('[Jellyseerr] First request sample:', JSON.stringify(response.data.results[0], null, 2))
        }
        
        return response.data
    } catch (e) {
        console.error('Failed to fetch requests', e)
        return { results: [], total: 0 }
    }
  }

  async getUsers() {
    const client = await this.getClient()
    if (!client) return []

    try {
        const response = await client.get('/api/v1/user', {
            params: { take: 1000 } // Fetch all users to be sure
        })
        return response.data.results || []
    } catch (e) {
        console.error('Failed to fetch jellyseerr users', e)
        return []
    }
  }

  async findUserByEmailOrName(email?: string, name?: string) {
    if (!email && !name) return null
    
    const users = await this.getUsers()
    
    // Try to match by email first (more unique)
    if (email) {
        const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        if (user) return user
    }
    
    // Try to match by display name or name
    if (name) {
        const user = users.find((u: any) => 
            u.displayName?.toLowerCase() === name.toLowerCase() || 
            u.email?.split('@')[0].toLowerCase() === name.toLowerCase()
        )
        if (user) return user
    }
    
    return null
  }

  async requestMedia(tmdbId: number, mediaType: 'movie' | 'tv', title: string, userId?: string, seasons?: number[]) {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Configuration error' }

    try {
        const payload: any = {
            mediaType,
            mediaId: tmdbId,
        }
        
        if (seasons && seasons.length > 0) {
            payload.seasons = seasons
        }
        
        if (userId) {
            const numericId = parseInt(userId)
            if (!isNaN(numericId)) {
                payload.userId = numericId
            }
        }

        const response = await client.post('/api/v1/request', payload)
        return { success: true, data: response.data }
    } catch (e: any) {
        console.error('Failed to request media', e.response?.data || e.message)
        return { success: false, message: e.response?.data?.message || 'Request failed' }
    }
  }

  async getMediaAvailability(tmdbId: number, mediaType: 'movie' | 'tv') {
    return remember(`jellyseerr_availability_${mediaType}_${tmdbId}`, 1000 * 60 * 5, async () => {
        const client = await this.getClient()
        if (!client) {
            return { available: false, status: 'unknown', message: 'Jellyseerr not configured', seasons: [] }
        }

        try {
            // Try direct media fetch
            const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
            try {
                const response = await client.get(`/api/v1/${endpoint}/${tmdbId}`)
                const media = response.data
                const mediaInfo = media.mediaInfo
                
                if (mediaInfo) {
                    console.log(`[Jellyseerr] MediaInfo for ${tmdbId}:`, JSON.stringify(mediaInfo, null, 2))
                    const result = this.mapJellyseerrStatus(
                        mediaInfo.status, 
                        mediaInfo.downloadStatus, 
                        media.mediaAdded, 
                        media
                    )

                    // If it's a series, attach season statuses from Jellyseerr
                    if (mediaType === 'tv' && media.mediaInfo && media.mediaInfo.seasons) {
                        console.log(`[Jellyseerr] Seasons for ${tmdbId}:`, JSON.stringify(media.mediaInfo.seasons, null, 2))
                        
                        // Check for pending requests that might not be reflected in mediaInfo.seasons yet
                        if (media.mediaInfo.requests) {
                             media.mediaInfo.requests.forEach((req: any) => {
                                 // Status 1=PENDING APPROVAL, 2=APPROVED, 3=DECLINED
                                 if (req.status === 1 || req.status === 2) {
                                     req.seasons?.forEach((s: any) => {
                                         const existingSeason = media.mediaInfo.seasons.find((ms: any) => ms.seasonNumber === s.seasonNumber)
                                         if (existingSeason) {
                                             // If existing status is UNKNOWN (1), update to PENDING (2)
                                             if (existingSeason.status === 1) {
                                                 existingSeason.status = 2
                                             }
                                         } else {
                                             // Add new season status entry
                                             media.mediaInfo.seasons.push({
                                                 seasonNumber: s.seasonNumber,
                                                 status: 2 // Pending
                                             })
                                         }
                                     })
                                 }
                             })
                        }

                        // mediaInfo.seasons contains status per season
                        // [{ seasonNumber: 1, status: 5 }, ...]
                        result.seasons = media.mediaInfo.seasons
                    }
                    return result
                }
            } catch (e: any) {
                if (e.response && e.response.status === 404) {
                    // Not found, proceed to check requests
                } else {
                    throw e
                }
            }

            // Fallback for not found or not requested
            return { available: false, status: 'not_available', message: 'Non disponible' }

        } catch (e) {
            console.error('Jellyseerr availability check failed', e)
            return { available: false, status: 'unknown', message: 'Erreur lors de la vérification' }
        }
    })
  }

  private mapJellyseerrStatus(status: number, downloadStatus: number, mediaAdded: boolean, mediaData: any) {
    // For series, check if we can get detailed season info, otherwise fallback to global status
    // mediaData.mediaInfo.seasons might contain the actual status if populated, 
    // but usually status arg (mediaInfo.status) is the reliable aggregate.
    
    // Status codes:
    // 5: AVAILABLE
    // 4: PARTIALLY_AVAILABLE
    // 3: PROCESSING
    // 2: PENDING
    
    const base = { seasons: [] as any[] }
    
    if (status === 5) {
        return { ...base, available: true, status: 'available', message: 'Disponible' }
    }
    if (status === 4) {
        // Try to count seasons if possible
        // Note: mediaData.seasons is from TMDB, usually doesn't have status. 
        // We would need mediaData.mediaInfo.seasons or similar.
        // But for now, just returning "Partiellement disponible" is safe.
        return { ...base, available: true, status: 'partial', message: 'Partiellement disponible' }
    }
    if (status === 3) {
        return { ...base, available: false, status: 'processing', message: 'En cours de traitement' }
    }
    if (status === 2) {
        return { ...base, available: false, status: 'pending', message: 'En attente' }
    }
    
    // Fallback if status is unknown but mediaAdded is true (untracked by Jellyseerr requests but present?)
    if (mediaAdded) {
         return { ...base, available: true, status: 'available', message: 'Disponible', seasons: [] }
    }

    return { ...base, available: false, status: 'not_available', message: 'Non disponible', seasons: [] }
  }

  async getMedia(tmdbId: number, mediaType: 'movie' | 'tv') {
    const client = await this.getClient()
    if (!client) return null

    try {
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
        const response = await client.get(`/api/v1/${endpoint}/${tmdbId}`)
        return response.data
    } catch (e) {
        return null
    }
  }

  async deleteMedia(mediaId: number) {
    const client = await this.getClient()
    if (!client) return { success: false }

    try {
        await client.delete(`/api/v1/media/${mediaId}`)
        return { success: true }
    } catch (e) {
        console.error('Failed to delete media', e)
        return { success: false }
    }
  }

  async deleteRequest(requestId: number) {
    const client = await this.getClient()
    if (!client) return { success: false }

    try {
        await client.delete(`/api/v1/request/${requestId}`)
        return { success: true }
    } catch (e) {
        console.error('Failed to delete request', e)
        return { success: false }
    }
  }
}

export const jellyseerrService = new JellyseerrService()
