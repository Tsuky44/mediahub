import axios from 'axios'
import { insecureHttpsAgent, keepAliveHttpAgent } from '../http-agents'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export class JellyfinService {
  private baseUrl: string
  private apiKey: string
  private httpsAgent = insecureHttpsAgent

  constructor(baseUrl: string, apiKey: string) {
    // Remove trailing slash and /web/... if present
    this.baseUrl = baseUrl.split('/web/')[0].replace(/\/$/, '')
    this.apiKey = apiKey
    
    // API Key is optional for public endpoints or login, but required for admin tasks
    // if (!this.baseUrl) {
    //   throw new Error('Jellyfin configuration missing: URL is null')
    // }
  }

  async getClient(timeout: number = 10000) {
    return axios.create({
      baseURL: this.baseUrl,
      params: {
        api_key: this.apiKey
      },
      timeout,
      httpAgent: keepAliveHttpAgent,
      httpsAgent: this.httpsAgent,
      maxRedirects: 5, 
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Emby-Token': this.apiKey, // Jellyfin accepts X-Emby-Token or X-MediaBrowser-Token
        'X-MediaBrowser-Token': this.apiKey
      }
    })
  }

  async authenticate(username: string, pw: string) {
    log(`[JellyfinService] Authenticating user '${username}' against ${this.baseUrl}`)
    
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
            httpAgent: keepAliveHttpAgent,
            httpsAgent: this.httpsAgent,
            timeout: 15000, 
            maxRedirects: 5
        })
    }

    try {
        const response = await performAuth(this.baseUrl);
        log(`[JellyfinService] Auth success for ${username}`)
        return response.data
    } catch (e: any) {
        // Auto-retry with host.docker.internal if localhost fails
        if ((this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) && 
            (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'EHOSTUNREACH')) {
            
            warn(`[JellyfinService] Connection to ${this.baseUrl} failed (${e.code}). Retrying with host.docker.internal...`)
            try {
                const newUrl = this.baseUrl.replace(/localhost|127\.0\.0\.1/g, 'host.docker.internal');
                const response = await performAuth(newUrl);
                log(`[JellyfinService] Auth success using host.docker.internal`)
                return response.data
            } catch (retryError: any) {
                error(`[JellyfinService] Retry failed:`, retryError.message)
                throw e // Throw original error if retry fails
            }
        }
        error(`[JellyfinService] Auth failed:`, e.message)
        throw e
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
    
    // Handle { Items: [...] } response format
    if (response.data && Array.isArray(response.data.Items)) {
      return response.data.Items
    }

    warn('[JellyfinService] Unexpected getUsers response format:', response.data)
    // Return empty array if format is valid but empty, but let caller decide how to handle "0 users"
    return [] 
  }

  getItemImageUrl(itemId: string, width: number = 400) {
    return `${this.baseUrl}/Items/${itemId}/Images/Primary?maxWidth=${width}`
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
    } catch (e: any) {
      error('[JellyfinService] getItemDetails failed:', e.message)
      return null
    }
  }
}
