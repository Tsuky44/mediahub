import axios, { AxiosInstance } from 'axios'
import { getSetting } from '@/lib/settings'

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
        console.log('[qBittorrent] Attempting login...')
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
            client.defaults.headers.common['Cookie'] = cookie.split(';')[0]
        }
      } catch (e) {
        if (axios.isAxiosError(e)) {
            console.error('[qBittorrent] Authentication failed:', e.response?.status, e.response?.data || e.message)
        } else {
            console.error('[qBittorrent] Authentication failed:', e instanceof Error ? e.message : e)
        }
        throw e
      }
    }

    this.client = client
  }

  private async request<T>(config: any, retry: boolean = true): Promise<T> {
      try {
          await this.init()
          if (!this.client) throw new Error('Client not initialized')
          const response = await this.client.request(config)
          return response.data
      } catch (error) {
          if (retry && axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 401)) {
              console.log('[qBittorrent] Session expired or unauthorized, retrying...')
              await this.init(true) // Force re-init
              return this.request(config, false) // Retry once
          }
          throw error
      }
  }

  async getTorrents(filter: string = 'all') {
    return this.request<Torrent[]>({
        method: 'GET',
        url: '/api/v2/torrents/info',
        params: { filter }
    })
  }

  async addTorrent(urls: string | null, files: any[] | null, savepath?: string) {
      const formData = new FormData()
      if (urls) formData.append('urls', urls)
      if (savepath) formData.append('savepath', savepath)
      
      if (files && files.length > 0) {
          files.forEach(file => {
              formData.append('torrents', file)
          })
      }
      
      return this.request({
          method: 'POST',
          url: '/api/v2/torrents/add',
          data: formData,
          headers: {
             'Content-Type': 'multipart/form-data'
          }
      })
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
}
