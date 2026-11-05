import axios from 'axios'
import { createHash } from 'crypto'
import {
  freshHttpAgent,
  freshInsecureHttpsAgent,
  insecureHttpsAgent,
  keepAliveHttpAgent,
} from '../http-agents'
import { logger } from '../logger'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };

/**
 * Échec de connexion Jellyfin, avec un message déjà lisible par l'utilisateur.
 * `invalid-credentials` : seul cas qui compte comme tentative ratée (limiteur de connexions).
 */
export class JellyfinAuthError extends Error {
  constructor(
    message: string,
    readonly kind: 'invalid-credentials' | 'refused' | 'unavailable',
    readonly status?: number
  ) {
    super(message)
    this.name = 'JellyfinAuthError'
  }
}

/** Texte renvoyé par Jellyfin (ProblemDetails JSON ou texte brut), borné pour les logs */
function responseDetail(data: unknown): string | undefined {
  if (data == null || data === '') return undefined
  let text: string
  if (typeof data === 'string') text = data
  else if (typeof data === 'object') {
    const d = data as { title?: unknown; detail?: unknown; Message?: unknown }
    text = [d.title, d.detail, d.Message].find((v) => typeof v === 'string') as string
      ?? JSON.stringify(data)
  } else text = String(data)
  return text.replace(/\s+/g, ' ').trim().slice(0, 200) || undefined
}

/** Identifiant d'appareil stable par utilisateur : un seul appareil MediaHub côté Jellyfin */
function deviceIdFor(username: string): string {
  const hash = createHash('sha256').update(username.toLowerCase()).digest('hex').slice(0, 12)
  return `mediahub-${hash}`
}

const AUTH_RETRY_DELAY_MS = 300

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

  /**
   * Connexion par nom d'utilisateur. Jellyfin répond parfois 400 / 5xx de façon passagère
   * (proxy, socket coupée, en-tête d'authentification selon la version) puis accepte la
   * requête identique : un essai de plus, sur une connexion neuve, avec l'autre style
   * d'en-tête. Un 401 (identifiants faux) n'est jamais rejoué : il compterait deux fois
   * dans le verrouillage de compte de Jellyfin.
   */
  async authenticate(username: string, pw: string) {
    const cleanUsername = username.trim()
    const deviceId = deviceIdFor(cleanUsername)
    const clientInfo = `Client="MediaHub", Device="MediaHub", DeviceId="${deviceId}", Version="1.0.0"`
    // 1er essai : en-tête standard ; 2e essai : en-tête historique (anciens serveurs)
    const authHeaders: Record<string, string>[] = [
      { Authorization: `MediaBrowser ${clientInfo}` },
      { 'X-Emby-Authorization': `MediaBrowser ${clientInfo}` },
    ]

    const performAuth = (url: string, headers: Record<string, string>) =>
      axios.post(`${url}/Users/AuthenticateByName`, { Username: cleanUsername, Pw: pw }, {
        headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
        httpAgent: freshHttpAgent,
        httpsAgent: freshInsecureHttpsAgent,
        timeout: 15000,
        maxRedirects: 5,
      })

    let lastError: any
    for (let attempt = 0; attempt < authHeaders.length; attempt++) {
      let url = this.baseUrl
      try {
        log(`[JellyfinService] Authenticating '${cleanUsername}' against ${url} (essai ${attempt + 1})`)
        try {
          return (await performAuth(url, authHeaders[attempt])).data
        } catch (e: any) {
          // Docker : localhost injoignable depuis le conteneur -> host.docker.internal
          const local = url.includes('localhost') || url.includes('127.0.0.1')
          if (local && ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(e.code)) {
            warn(`[JellyfinService] Connexion à ${url} impossible (${e.code}), essai via host.docker.internal`)
            url = url.replace(/localhost|127\.0\.0\.1/g, 'host.docker.internal')
            try {
              return (await performAuth(url, authHeaders[attempt])).data
            } catch {
              throw e // l'erreur d'origine reste la plus parlante
            }
          }
          throw e
        }
      } catch (e: any) {
        lastError = e
        const status: number | undefined = e.response?.status
        const detail = responseDetail(e.response?.data)
        logger.warn('[JellyfinService] Échec de connexion Jellyfin', {
          host: this.baseUrl.replace(/^https?:\/\//, '').split('/')[0],
          attempt: attempt + 1,
          status,
          code: e.code,
          detail,
        })

        if (status === 401) {
          throw new JellyfinAuthError("Nom d'utilisateur ou mot de passe incorrect", 'invalid-credentials', 401)
        }
        if (status === 403) {
          throw new JellyfinAuthError(
            `Jellyfin a refusé la connexion (403)${detail ? ` : ${detail}` : ''}`,
            'refused',
            403
          )
        }
        if (attempt < authHeaders.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
        }
      }
    }

    const status: number | undefined = lastError?.response?.status
    const detail = responseDetail(lastError?.response?.data)
    throw new JellyfinAuthError(
      status
        ? `Jellyfin a répondu ${status}${detail ? ` : ${detail}` : ''}. Réessayez.`
        : `Impossible de joindre le serveur Jellyfin${lastError?.code ? ` (${lastError.code})` : ''}`,
      'unavailable',
      status
    )
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
