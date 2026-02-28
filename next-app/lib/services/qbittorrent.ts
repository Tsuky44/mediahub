import axios, { AxiosInstance } from 'axios'
import { getSetting } from '../settings'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function getQBittorrentService() {
  const url = await getSetting('qbittorrent_url')
  const username = await getSetting('qbittorrent_username')
  const password = await getSetting('qbittorrent_password')
  
  if (!url) return null
  return new QBittorrentService(url, username, password)
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
  tags: string
  num_incomplete: number
  num_complete: number
  tracker: string
  category: string
  last_activity: number
  completion_on: number
  availability: number
}

export class QBittorrentService {
  private client: AxiosInstance | null = null
  private baseUrl: string
  private username?: string
  private password?: string

  constructor(baseUrl: string, username?: string, password?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.username = username
    this.password = password
  }

  private async init(force: boolean = false) {
    if (this.client && !force) return

    const refererUrl = `${this.baseUrl}/`

    const client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Referer': refererUrl,
        'Origin': this.baseUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

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
        
        // Setup cookie for subsequent requests
        const setCookie = response.headers['set-cookie']
        if (setCookie) {
            const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
            // Some qBittorrent versions return cookie with HttpOnly; etc.
            // We need the SID part.
            const sid = cookie.split(';')[0]
            if (sid) {
                client.defaults.headers.common['Cookie'] = sid
            }
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

  private async request<T>(config: any, retry: boolean = true): Promise<T> {
      try {
          await this.init()
          if (!this.client) throw new Error('Client not initialized')
          const response = await this.client.request(config)
          return response.data
      } catch (error) {
          if (retry && axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 401)) {
              log('[qBittorrent] Session expired or unauthorized, retrying...')
              await this.init(true) // Force re-init
              return this.request(config, false) // Retry once
          }
          throw error
      }
  }

  async addTorrent(url: string, files?: File[], category?: string | null) {
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

    return this.request({
      method: 'POST',
      url: '/api/v2/torrents/add',
      data: formData,
      headers: {
        // Axios gère automatiquement le Content-Type pour FormData
      }
    })
  }

  async getTorrents(filter: string = 'all') {
    return this.request<Torrent[]>({
        method: 'GET',
        url: '/api/v2/torrents/info',
        params: { filter }
    })
  }

  async getServerState() {
    const data = await this.request<any>({
        method: 'GET',
        url: '/api/v2/sync/maindata'
    })
    return data?.server_state
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
}
