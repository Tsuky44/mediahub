import axios, { type AxiosInstance } from 'axios'
import https from 'https'
import { getHttpsAgent, keepAliveHttpAgent } from '../http-agents'
// Imports relatifs : ce fichier est aussi chargé par le tracker (tsx, sans tsconfig dans l'image)
import { createMemoCache } from '../cache'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


// Index id TMDB -> id Emby des éléments visibles par un utilisateur (par type), partagé
// entre toutes les fiches média. Les données de visionnage (UserData) ne sont jamais
// mises en cache : l'élément trouvé est relu en direct.
interface TmdbIndex { ids: Map<string, string>; builtAt: number }
const tmdbIndexes = createMemoCache({ max: 200, ttl: 10 * 60_000 })
// Un id TMDB absent de l'index n'est considéré absent d'Emby que si l'index a moins d'1 min
const TMDB_INDEX_NOT_FOUND_TTL_MS = 60_000
// Id du serveur (statique) mis en cache par URL
const serverIds = createMemoCache({ max: 20, ttl: 60 * 60_000 })

export class EmbyService {
  private baseUrl: string
  private apiKey: string
  private httpsAgent: https.Agent
  /** Un client axios par timeout, réutilisé (évite axios.create à chaque appel). */
  private clients = new Map<number, AxiosInstance>()

  /**
   * @param skipSslVerify - Si true (défaut), ignore les erreurs de certificat SSL (comportement historique).
   *                        Passer false pour activer la vérification stricte SSL.
   */
  constructor(baseUrl: string, apiKey: string, skipSslVerify: boolean = true) {
    // Remove trailing slash and /web/... if present
    this.baseUrl = baseUrl.split('/web/')[0].replace(/\/$/, '')
    this.apiKey = apiKey
    this.httpsAgent = getHttpsAgent(skipSslVerify)
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Emby configuration missing: URL or API Key is null')
    }
  }

  async getClient(timeout: number = 10000) {
    const existing = this.clients.get(timeout)
    if (existing) return existing
    const client = axios.create({
      baseURL: this.baseUrl,
      params: {
        api_key: this.apiKey
      },
      timeout,
      httpAgent: keepAliveHttpAgent,
      httpsAgent: this.httpsAgent,
      maxRedirects: 5, // Allow some redirects
      validateStatus: (status) => status >= 200 && status < 400, // Allow 3xx
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Emby-Token': this.apiKey // Some proxies/Emby versions prefer this
      }
    })
    this.clients.set(timeout, client)
    return client
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

  getBaseUrl() {
    return this.baseUrl
  }

  getApiKey() {
    return this.apiKey
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

  async getUserItems(userId: string, filters: Record<string, unknown> = {}) {
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

  /** Métadonnées complètes d'un élément (fiche du gestionnaire de stockage). */
  async getItemInfo(itemId: string): Promise<Record<string, unknown> | null> {
    try {
      const client = await this.getClient(10000)
      const response = await client.get('/Items', {
        params: {
          Ids: itemId,
          Fields: 'Overview,Genres,Studios,Path,DateCreated,ProviderIds,PremiereDate,EndDate,Status,CommunityRating,OfficialRating,ProductionYear,RunTimeTicks',
        },
      })
      return response.data?.Items?.[0] ?? null
    } catch (e) {
      error('[EmbyService] getItemInfo failed:', e)
      return null
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

  /** Index léger (sans UserData ni images) des mêmes 1000 éléments que la recherche historique. */
  private async getTmdbIndex(userId: string, type: string, refresh: boolean): Promise<TmdbIndex> {
      const key = `${this.baseUrl}|${userId}|${type}`
      if (refresh) tmdbIndexes.delete(key)
      return tmdbIndexes.get<TmdbIndex>(key, async () => {
          const allItems = await this.getUserItems(userId, {
              IncludeItemTypes: type,
              Recursive: true,
              Fields: 'ProviderIds',
              EnableUserData: false,
              EnableImages: false,
              Limit: 1000
          })
          const ids = new Map<string, string>()
          for (const i of (allItems.Items ?? []) as Record<string, unknown>[]) {
              const providerIds = i.ProviderIds as Record<string, string> | undefined
              const tmdb = providerIds?.Tmdb ? String(providerIds.Tmdb) : null
              // Premier élément correspondant, comme le find() historique
              if (tmdb && i.Id != null && !ids.has(tmdb)) ids.set(tmdb, String(i.Id))
          }
          return { ids, builtAt: Date.now() }
      // Index vide = Emby injoignable ou bibliothèque vide : non mis en cache
      }, { cacheIf: (index) => index.ids.size > 0 })
  }

  async getItemByTmdbId(userId: string, tmdbId: number, type: 'Movie' | 'Series' | 'Episode') {
      // Relit l'élément avec exactement les mêmes paramètres que la recherche historique
      const fetchItem = async (itemId: string) => {
          const items = await this.getUserItems(userId, {
              IncludeItemTypes: type,
              Recursive: true,
              Fields: 'UserData,ProviderIds',
              Limit: 1000,
              Ids: itemId
          })
          const match = items.Items?.find((i: Record<string, unknown>) => {
              const providerIds = i.ProviderIds as Record<string, string> | undefined
              return providerIds?.Tmdb && String(providerIds.Tmdb) === String(tmdbId)
          })
          return match || null
      }

      let index = await this.getTmdbIndex(userId, type, false)
      let itemId = index.ids.get(String(tmdbId))

      // Absent d'un index ancien : il a peut-être été ajouté depuis -> index rafraîchi
      if (!itemId && Date.now() - index.builtAt > TMDB_INDEX_NOT_FOUND_TTL_MS) {
          index = await this.getTmdbIndex(userId, type, true)
          itemId = index.ids.get(String(tmdbId))
      }
      if (!itemId) return null

      const item = await fetchItem(itemId)
      if (item) return item

      // Élément supprimé ou remplacé depuis la création de l'index
      index = await this.getTmdbIndex(userId, type, true)
      itemId = index.ids.get(String(tmdbId))
      return itemId ? fetchItem(itemId) : null
  }

  /** Id du serveur (stable) : mis en cache 1 h au lieu d'appeler /System/Info/Public à chaque fiche. */
  async getServerId(): Promise<string | null> {
      return serverIds.get(this.baseUrl, async () => {
          const sysInfo = await this.getSystemInfo() as { Id?: string } | null
          return sysInfo?.Id || null
      })
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

  /**
   * Récupère la date de dernière lecture par item (itemId -> date ISO) depuis
   * le plugin Emby "Playback Reporting" (table PlaybackActivity), via une seule
   * requête SQL agrégée côté serveur. C'est la même source que la partie stats.
   *
   * NB: Emby ne renvoie pas LastPlayedDate dans les requêtes de liste standard
   * (UserData allégé), et le plugin a une rétention limitée (~quelques mois) :
   * les lectures plus anciennes ne seront donc pas présentes ici.
   *
   * Les dates PlaybackActivity ont le format "YYYY-MM-DD HH:MM:SS.fffffff" (UTC).
   */
  async getPlaybackActivityDates(): Promise<Record<string, string>> {
    const map: Record<string, string> = {}
    try {
      const data = await this.getCustomQuery(
        'SELECT ItemId, MAX(DateCreated) FROM PlaybackActivity GROUP BY ItemId'
      )
      const rows: Array<Array<unknown>> = data?.results || []
      for (const row of rows) {
        const itemId = row[0] != null ? String(row[0]) : null
        const rawDate = row[1] != null ? String(row[1]) : null
        if (!itemId || !rawDate) continue

        // Normalise "2026-07-08 13:40:20.1554178" -> ISO UTC
        const normalized = rawDate.includes('T')
          ? rawDate
          : rawDate.replace(' ', 'T').replace(/(\.\d{3})\d*$/, '$1') + (rawDate.endsWith('Z') ? '' : 'Z')
        const d = new Date(normalized)
        if (isNaN(d.getTime())) continue
        map[itemId] = d.toISOString()
      }
    } catch (e) {
      warn('[EmbyService] getPlaybackActivityDates failed (plugin Playback Reporting requis):', (e as Error).message)
    }
    return map
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
                        Fields: 'UserData,ParentIndexNumber,IndexNumber,RunTimeTicks',
                        // Trié par date de lecture décroissante : le premier épisode
                        // "vu" (ou en cours) rencontré est donc le plus récent.
                        SortBy: 'DatePlayed',
                        SortOrder: 'Descending'
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

                let lastPlayedEpisode: Record<string, unknown> | null = null
                // Épisode le plus récemment vu/en cours (le 1er de la liste triée
                // par DatePlayed qui a une activité). Sert de repli quand Emby ne
                // renvoie pas LastPlayedDate dans les requêtes de liste.
                let mostRecentActiveEpisode: Record<string, unknown> | null = null
                
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

                    const hasActivity = ep.UserData?.Played || ep.UserData?.PlaybackPositionTicks > 0
                    if (ep.UserData?.Played) {
                        playedCount++
                        sStat.played++
                        if (ep.RunTimeTicks) playedDuration += ep.RunTimeTicks
                    } else if (ep.UserData?.PlaybackPositionTicks) {
                         if (ep.RunTimeTicks) playedDuration += ep.UserData.PlaybackPositionTicks
                    }

                    // Liste triée par DatePlayed desc : le 1er épisode avec activité
                    // est le plus récent.
                    if (hasActivity && !mostRecentActiveEpisode) {
                        mostRecentActiveEpisode = ep
                    }

                    // Last Played (présent uniquement si Emby ne l'a pas retiré)
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

                // Emby ne renvoie pas LastPlayedDate dans les requêtes de liste :
                // on lit alors la vraie date via une lecture unitaire de l'épisode
                // le plus récemment vu par cet utilisateur.
                if (!lastPlayedDate && mostRecentActiveEpisode) {
                    try {
                        const epDetail = await this.getItemDetails(String(mostRecentActiveEpisode.Id), String(user.Id))
                        const lpd = epDetail?.UserData?.LastPlayedDate
                        if (lpd) {
                            const d = new Date(lpd)
                            if (!isNaN(d.getTime())) {
                                lastPlayedDate = d
                                lastPlayedEpisode = mostRecentActiveEpisode
                            }
                        }
                    } catch (e) {
                        // lecture unitaire échouée : on laisse null
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
                        episodeIds: episodes.map((e: Record<string, unknown>) => e.Id)
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
      const seasonsMap = new Map<string, Record<string, unknown>>()
      
      // Initialize seasons from season items
      seasons.forEach((s: Record<string, unknown>) => {
          seasonsMap.set(String(s.Id), {
              id: s.Id,
              name: s.Name,
              index: s.IndexNumber,
              size: 0,
              episodesCount: 0,
              path: s.Path
          })
      })
      
      episodes.forEach((ep: Record<string, unknown>) => {
          const seasonId = String(ep.SeasonId)
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
          const mediaSources = ep.MediaSources as unknown[] | undefined
          if (Array.isArray(mediaSources) && mediaSources.length > 0) {
              size = mediaSources.reduce((acc: number, src: unknown) => acc + (((src as Record<string, unknown>).Size as number | undefined) || 0), 0)
          }
          
          const s = season as Record<string, unknown> & { size: number; episodesCount: number }
          s.size += size
          s.episodesCount += 1
      })
      
      return Array.from(seasonsMap.values()).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.index as number) - (b.index as number))
      
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
                return pbQueryResponse.data.results.map((item: Array<unknown>) => ({
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
            warn('[EmbyService] Custom query failed, falling back to endpoints:', (e as Error).message)
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
            return response.data.results.map((item: Array<unknown>) => ({
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
