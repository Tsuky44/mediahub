import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { getSetting } from '../settings'
import { CookieJar } from 'tough-cookie'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };


let _cachedService: QBittorrentService | null = null
let _cachedUrl: string | undefined
let _cachedUsername: string | undefined

export async function getQBittorrentService() {
  const url = await getSetting('qbittorrent_url')
  const username = await getSetting('qbittorrent_username')
  const password = await getSetting('qbittorrent_password')

  if (!url) {
    _cachedService = null
    _cachedUrl = undefined
    _cachedUsername = undefined
    return null
  }

  if (!_cachedService || _cachedUrl !== url || _cachedUsername !== username) {
    _cachedService = new QBittorrentService(url, username, password)
    _cachedUrl = url
    _cachedUsername = username
  }

  return _cachedService
}

export interface Torrent {
  hash: string
  name: string
  state: string
  progress: number
  dlspeed: number
  upspeed: number
  eta: number
  size: number
  num_seeds: number
  num_leechs: number
  added_on: number
  ratio: number
  uploaded: number
  downloaded: number
  uploaded_session: number
  downloaded_session: number
  tags: string
  num_incomplete: number
  num_complete: number
  tracker: string
  category: string
  last_activity: number
  completion_on: number
  availability: number
  max_seeding_time: number
  seeding_time: number
}

export class QBittorrentService {
  private client: AxiosInstance | null = null
  private cookieJar: CookieJar
  private baseUrl: string
  private username?: string
  private password?: string

  constructor(baseUrl: string, username?: string, password?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.username = username
    this.password = password
    this.cookieJar = new CookieJar()
  }

  async reinit(): Promise<void> {
    return this.init(true)
  }

  private async init(force: boolean = false) {
    if (this.client && !force) return

    const refererUrl = `${this.baseUrl}/`

    const client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10_000,
      withCredentials: true,
      responseType: 'text',
      transformResponse: (v) => v,
      headers: {
        'Referer': refererUrl,
      },
    })

    client.interceptors.request.use(async (config) => {
      const url = (config.url?.startsWith('http') ? config.url : `${config.baseURL}${config.url}`) || this.baseUrl
      const cookieString = await this.cookieJar.getCookieString(url)
      if (cookieString) {
        config.headers = config.headers || {}
        config.headers['Cookie'] = cookieString
      }
      return config
    })

    client.interceptors.response.use(
      async (response) => {
        const setCookie = response.headers['set-cookie']
        if (setCookie) {
          const url = (response.config.url?.startsWith('http') ? response.config.url : `${response.config.baseURL}${response.config.url}`) || this.baseUrl
          for (const cookie of setCookie) {
            await this.cookieJar.setCookie(cookie, url)
          }
        }
        return response
      },
      async (error) => {
        if (error.response?.headers?.['set-cookie']) {
          const url = (error.config?.url?.startsWith('http') ? error.config.url : `${error.config?.baseURL}${error.config?.url}`) || this.baseUrl
          for (const cookie of error.response.headers['set-cookie']) {
            await this.cookieJar.setCookie(cookie, url)
          }
        }
        throw error
      }
    )

    client.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    // Authenticate
    if (this.username && this.password) {
      try {
        log('[qBittorrent] Attempting login...')
        const params = new URLSearchParams()
        params.append('username', this.username)
        params.append('password', this.password)

        const response = await client.post('/api/v2/auth/login', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        
        // Cookie automatically stored by response interceptor
        if (response.data === 'Ok.') {
          // Cookie automatically stored by response interceptor
        } else if (response.data === "Ok.") {
             // Some versions/configs might return Ok without cookie if already auth or local bypass
             // But usually they return a cookie. 
             // If no cookie, we continue, maybe it's using IP whitelist.
             log('[qBittorrent] Login successful but no cookie received. Assuming IP whitelist.')
        }
      } catch (e) {
        if (axios.isAxiosError(e)) {
            error('[qBittorrent] Authentication failed:', e.response?.status, e.response?.data || e.message)
             // If 404, maybe it's an old version using /login
             if (e.response?.status === 404) {
                 log('[qBittorrent] /api/v2/auth/login not found, trying legacy /login')
                 try {
                    const params = new URLSearchParams()
                    params.append('username', this.username)
                    params.append('password', this.password)
                    const response = await client.post('/login', params.toString())
                     const setCookie = response.headers['set-cookie']
                     if (setCookie) {
                         const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
                         client.defaults.headers.common['Cookie'] = cookie.split(';')[0]
                     }
                } catch (legacyError) {
                    error('[qBittorrent] Legacy login also failed', legacyError)
                    throw new Error('Authentication failed: Could not log in via v2 or legacy API. Check URL and credentials.')
                }
            } else {
                throw e
            }
        } else {
            error('[qBittorrent] Authentication failed:', e instanceof Error ? e.message : e)
            throw new Error(`Authentication failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
    }

    this.client = client
  }

  async testConnection() {
      try {
          await this.init(true)
          const version = await this.request<string>({
              method: 'GET',
              url: '/api/v2/app/version'
          })
          return { success: true, version }
      } catch (e: any) {
          error('[qBittorrent] Test connection failed:', e.message)
          return { success: false, error: e.message }
      }
  }

  private async request<T>(config: AxiosRequestConfig, retry: boolean = true): Promise<T> {
      try {
          await this.init()
          if (!this.client) throw new Error('Client not initialized')
          const response = await this.client.request(config)
          let data = response.data
          // Axios responseType is 'text' to handle plain-text responses (e.g. login "Ok.").
          // Parse JSON strings automatically for API endpoints that return JSON.
          if (typeof data === 'string') {
              const trimmed = data.trim()
              if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
                  try { data = JSON.parse(data) } catch { /* keep raw string */ }
              }
          }
          return data as T
      } catch (error) {
          if (retry && axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 401)) {
              log('[qBittorrent] Session expired or unauthorized, retrying...')
              await this.init(true) // Force re-init
              return this.request(config, false) // Retry once
          }
          throw error
      }
  }

  async addTorrent(url: string, files?: File[], category?: string | null, tags?: string[]) {
    const formData = new FormData()

    if (url) {
      formData.append('urls', url)
    }

    if (files && files.length > 0) {
      for (const file of files) {
        // En Node.js (côté serveur), on doit convertir le File en Blob ou Buffer pour FormData si nécessaire
        // Mais Next.js Server Actions fournit des objets File compatibles
        formData.append('torrents', file)
      }
    }

    if (category) formData.append('category', category)
    if (tags && tags.length > 0) formData.append('tags', tags.join(','))

    return this.request({
      method: 'POST',
      url: '/api/v2/torrents/add',
      data: formData,
      headers: {
        // Axios gère automatiquement le Content-Type pour FormData
      }
    })
  }

  /**
   * Extract infoUrl from torrent tags
   * Tags format: infoUrl:https://tracker.com/torrent/12345
   */
  getInfoUrlFromTags(tags: string): string | null {
    if (!tags) return null
    const tagList = tags.split(',')
    const infoUrlTag = tagList.find(tag => tag.trim().startsWith('infoUrl:'))
    if (infoUrlTag) {
      return infoUrlTag.trim().substring(8) // Remove 'infoUrl:' prefix
    }
    return null
  }

  async getTorrents(filter: string = 'all') {
    return this.request<Torrent[]>({
        method: 'GET',
        url: '/api/v2/torrents/info',
        params: { filter }
    })
  }

  /**
   * Incremental sync — returns deltas since last `rid`.
   * Used by NotificationsV2 realtime layer for near-zero-cost change detection.
   */
  async getSyncMainData(rid: number = 0) {
    return this.request<{
      rid: number
      full_update?: boolean
      torrents?: Record<string, Partial<Torrent>>
      torrents_removed?: string[]
    }>({
        method: 'GET',
        url: '/api/v2/sync/maindata',
        params: { rid }
    })
  }

  async getServerState() {
    try {
        const data = await this.request<any>({
            method: 'GET',
            url: '/api/v2/sync/maindata'
        })
        
        const serverState = data?.server_state || {}
        const torrents = data?.torrents || {}
        
        let globalSeeds = 0
        let globalLeechs = 0
        
        const torrentValues = Object.values(torrents) as Array<{ num_seeds?: number; num_leechs?: number }>
        torrentValues.forEach((t) => {
            globalSeeds += t.num_seeds || 0
            globalLeechs += t.num_leechs || 0
        })
        
        return {
            ...serverState,
            global_seeds: globalSeeds,
            global_leechs: globalLeechs
        }
    } catch (e) {
        // Fallback to basic info if maindata fails (though maindata is the main endpoint)
        console.error('Failed to get full server state, trying transfer/info', e)
        const info = await this.request<any>({
            method: 'GET',
            url: '/api/v2/transfer/info'
        })
        return {
            ...info,
            global_seeds: 0,
            global_leechs: 0
        }
    }
  }
  
  async deleteTorrents(hashes: string[], deleteFiles: boolean = false) {
      const params = new URLSearchParams()
      params.append('hashes', hashes.join('|'))
      params.append('deleteFiles', deleteFiles ? 'true' : 'false')

      return this.request({
          method: 'POST',
          url: '/api/v2/torrents/delete',
          data: params,
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
          }
      })
  }

  async pauseTorrents(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))

    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/pause',
        data: params,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
  }

  async resumeTorrents(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))

    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/resume',
        data: params,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
  }

  async topPriority(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/topPrio',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async increasePriority(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/increasePrio',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async decreasePriority(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/decreasePrio',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async bottomPriority(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/bottomPrio',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async reannounceTorrents(hashes: string[]) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/reannounce',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async setShareLimits(hashes: string[], ratioLimit: number, seedingTimeLimit: number, inactiveSeedingTimeLimit: number = -1) {
    const params = new URLSearchParams()
    params.append('hashes', hashes.join('|'))
    params.append('ratioLimit', ratioLimit.toString())
    params.append('seedingTimeLimit', seedingTimeLimit.toString())
    params.append('inactiveSeedingTimeLimit', inactiveSeedingTimeLimit.toString())
    
    return this.request({
        method: 'POST',
        url: '/api/v2/torrents/setShareLimits',
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  }

  async getCategories() {
    return this.request<Record<string, { name: string, savePath: string }>>({
        method: 'GET',
        url: '/api/v2/torrents/categories'
    })
  }

  async getTags() {
    return this.request<string[]>({
        method: 'GET',
        url: '/api/v2/torrents/tags'
    })
  }

  async getTransferInfo() {
    return this.request<{ dl_info_data: number, up_info_data: number, dl_info_speed: number, up_info_speed: number }>({
        method: 'GET',
        url: '/api/v2/transfer/info'
    })
  }

  async getTorrentProperties(hash: string) {
    return this.request<{
      save_path: string
      creation_date: number
      piece_size: number
      comment: string
      total_wasted: number
      total_uploaded: number
      total_downloaded: number
      up_limit: number
      dl_limit: number
      time_elapsed: number
      seeding_time: number
      nb_connections: number
      share_ratio: number
      addition_date: number
      completion_date: number
      created_by: string
      dl_speed_avg: number
      dl_speed: number
      up_speed_avg: number
      up_speed: number
      eta: number
      last_seen: number
      peers: number
      peers_total: number
      pieces_have: number
      pieces_num: number
      reconnects: number
      seeds: number
      seeds_total: number
      total_size: number
    }>({
        method: 'GET',
        url: '/api/v2/torrents/properties',
        params: { hash }
    })
  }

  async getTorrentTrackers(hash: string) {
    return this.request<Array<{
      url: string
      status: number  // 0 = disabled, 1 = not contacted, 2 = working, 3 = updating, 4 = error
      tier: number
      num_peers: number
      num_seeds: number
      num_leeches: number
      num_downloaded: number
      msg: string
    }>>({
        method: 'GET',
        url: '/api/v2/torrents/trackers',
        params: { hash }
    })
  }
}
