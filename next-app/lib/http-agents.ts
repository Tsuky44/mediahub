/**
 * Agents HTTP(S) partagés avec keep-alive.
 *
 * Avant : chaque service (Emby, Jellyfin, Plex, Jellyseerr…) créait son propre
 * `https.Agent` sans keep-alive → une nouvelle connexion TCP + handshake TLS
 * à CHAQUE requête (souvent 50-200 ms perdus par appel).
 * Ici les sockets sont réutilisées entre requêtes et entre instances de services.
 */
import http from 'http'
import https from 'https'

const KEEP_ALIVE = {
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 64,
  maxFreeSockets: 16,
} as const

export const keepAliveHttpAgent = new http.Agent(KEEP_ALIVE)

/** Ignore les certificats invalides (serveurs média auto-hébergés : comportement historique). */
export const insecureHttpsAgent = new https.Agent({ ...KEEP_ALIVE, rejectUnauthorized: false })

/** Vérification SSL stricte. */
export const strictHttpsAgent = new https.Agent({ ...KEEP_ALIVE, rejectUnauthorized: true })

export function getHttpsAgent(skipSslVerify = true): https.Agent {
  return skipSslVerify ? insecureHttpsAgent : strictHttpsAgent
}
