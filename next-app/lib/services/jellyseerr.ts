import axios from 'axios'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { remember, forget } from '@/lib/cache'

export class JellyseerrService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  constructor(baseUrl?: string | null, apiKey?: string | null) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : null
    this.apiKey = apiKey || null
  }

  private async getClient() {
    if (!this.baseUrl || !this.apiKey) return null

    return axios.create({
      baseURL: this.baseUrl,
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
                filter: 'all' // Récupérer TOUTES les demandes de TOUS les utilisateurs
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

  async getMediaAvailability(tmdbId: number, mediaType: 'movie' | 'tv', bypassCache = false) {
    const cacheKey = `jellyseerr_availability_${mediaType}_${tmdbId}`
    if (bypassCache) {
        forget(cacheKey)
    }

    return remember(cacheKey, 1000 * 30, async () => { // Reduced to 30 seconds for better sync
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
                    console.log(`[Jellyseerr Debug] TMDB ID: ${tmdbId} | MediaInfo Status: ${mediaInfo.status} | DownloadStatus: ${mediaInfo.downloadStatus}`);
                    console.log(`[Jellyseerr Debug] Full Media Object:`, JSON.stringify(media, (key, value) => key === 'overview' ? undefined : value, 2));
                    
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
    // Status codes (MediaInfo status):
    // 1: UNKNOWN
    // 2: PENDING (Request exists but not yet approved/synced)
    // 3: PROCESSING (Approved and sent to Radarr/Sonarr)
    // 4: PARTIALLY_AVAILABLE
    // 5: AVAILABLE
    
    const base = { seasons: [] as any[] }
    
    // Check for requests in various places (Jellyseerr sometimes nests them differently)
    const requests = mediaData.mediaInfo?.requests || mediaData.requests || [];
    const activeRequests = requests.filter((req: any) => req.status !== 3 && req.status !== 4); // Filter out DECLINED (3) or VOID (4)
    const hasActiveRequests = activeRequests.length > 0;

    // Check for external service ID (Radarr/Sonarr)
    const externalServiceId = mediaData.mediaInfo?.externalServiceId || mediaData.externalServiceId;
    const hasExternalService = !!externalServiceId;

    console.log(`[Jellyseerr Status Mapping] TMDB: ${mediaData.id} | Status: ${status} | hasRequests: ${hasActiveRequests} | hasService: ${hasExternalService}`);

    // If fully available in Jellyseerr or Emby (mediaAdded)
    if (status === 5 || mediaAdded) {
        return { ...base, available: true, status: 'available', message: 'Disponible' }
    }

    // Partially available (usually for TV shows)
    if (status === 4) {
        return { ...base, available: true, status: 'partial', message: 'Partiellement disponible' }
    }
    
    // THE CORE LOGIC FOR "PROCESSING" (En cours de traitement)
    // It should be considered "processing" if:
    // 1. Jellyseerr status is PENDING (2) or PROCESSING (3)
    // 2. OR there is an active request (even if status is 1/UNKNOWN)
    // 3. OR there is an external service ID (meaning it's already in Radarr/Sonarr)
    if (status === 2 || status === 3 || hasActiveRequests || hasExternalService) {
        return { ...base, available: false, status: 'processing', message: 'En cours de traitement' }
    }

    // If none of the above, and it's not available, it's "Not Available"
    return { ...base, available: false, status: 'not_available', message: 'Non disponible', seasons: [] }
  }

  async getMedia(tmdbId: number, mediaType: 'movie' | 'tv') {
    const client = await this.getClient()
    if (!client) return null

    try {
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
        const response = await client.get(`/api/v1/${endpoint}/${tmdbId}`)
        const data = response.data

        // Force invalidate availability cache when fetching full media info
        // to ensure the status is fresh if accessed right after
        const cacheKey = `jellyseerr_availability_${mediaType}_${tmdbId}`
        forget(cacheKey)

        // Try to enrich with service URLs
        if (data.mediaInfo?.externalServiceId) {
            const serviceType = mediaType === 'movie' ? 'radarr' : 'sonarr'
            try {
                const settingsRes = await client.get(`/api/v1/settings/${serviceType}`)
                const settings = settingsRes.data
                // Get the first enabled server
                const server = settings.find((s: any) => s.isDefault) || settings[0]
                if (server && server.hostname) {
                    const baseUrl = server.hostname.startsWith('http') ? server.hostname : `http://${server.hostname}`
                    const port = server.port ? `:${server.port}` : ''
                    const urlBase = `${baseUrl}${port}${server.urlBase || ''}`
                    
                    if (mediaType === 'movie') {
                        data.mediaInfo.externalServiceUrl = `${urlBase}/movie/${data.mediaInfo.externalServiceId}`
                    } else {
                        // For Sonarr, it's usually /series/{slug} or /series/{id}
                        // Jellyseerr doesn't always provide the slug here, but let's try ID
                        data.mediaInfo.externalServiceUrl = `${urlBase}/series/${data.mediaInfo.externalServiceId}`
                    }
                }
            } catch (e) {
                // Ignore errors fetching settings
            }
        }

        return data
    } catch (e) {
        return null
    }
  }

  async deleteMedia(mediaId: number, deleteFiles: boolean = false) {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Non configuré' }

    try {
        console.log(`[Jellyseerr] Deleting media ${mediaId} (deleteFiles requested: ${deleteFiles})`);
        
        // Some versions of Jellyseerr don't support deleteFiles parameter and throw 400/500
        // We handle direct deletion via Radarr/Sonarr in the API route, 
        // so we can try to delete from Jellyseerr without the parameter if it fails.
        try {
            const response = await client.delete(`/api/v1/media/${mediaId}`, {
                params: deleteFiles ? { deleteFiles: true } : {}
            });
            return { success: true };
        } catch (e: any) {
            if (deleteFiles && (e.response?.status === 400 || e.response?.data?.message?.includes('deleteFiles'))) {
                console.warn(`[Jellyseerr] deleteFiles parameter not supported, retrying without it...`);
                await client.delete(`/api/v1/media/${mediaId}`);
                return { success: true, message: 'Deleted without files (parameter not supported)' };
            }
            throw e;
        }
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message;
        const errorData = e.response?.data;
        console.error(`[Jellyseerr] Failed to delete media ${mediaId}:`, errorMsg, errorData);
        return { success: false, message: errorMsg };
    }
  }

  async updateMediaStatus(mediaId: number, status: 'available' | 'unavailable' | 'processing' | 'pending') {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Non configuré' }

    try {
        await client.post(`/api/v1/media/${mediaId}/${status}`)
        return { success: true }
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message
        console.error('Failed to update media status', errorMsg)
        return { success: false, message: errorMsg }
    }
  }

  async deleteRequest(requestId: number) {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Non configuré' }

    try {
        await client.delete(`/api/v1/request/${requestId}`)
        return { success: true }
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message
        console.error('Failed to delete request', errorMsg)
        return { success: false, message: errorMsg }
    }
  }
}
