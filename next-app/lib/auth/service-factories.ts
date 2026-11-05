import { EmbyService } from '@/lib/services/emby'
import { PlexService } from '@/lib/services/plex'
import { JellyfinService } from '@/lib/services/jellyfin'
import { getTmdbService } from '@/lib/services/tmdb'
import { getRadarrService } from '@/lib/services/radarr'
import { getSonarrService } from '@/lib/services/sonarr'
import { getQBittorrentService } from '@/lib/services/qbittorrent'
import { getSmbService } from '@/lib/services/smb'
import { getFtpService } from '@/lib/services/ftp'
import { getLocalService } from '@/lib/services/local'
import { getProwlarrService } from '@/lib/services/prowlarr'
import { getSetting, readSettings } from '@/lib/settings'
import { logger } from '@/lib/logger'

export async function getEmbyServiceForUser() {
  const s = await readSettings(['emby_url', 'emby_api_key'])

  const embyUrl = s.emby_url || process.env.EMBY_URL
  const embyApiKey = s.emby_api_key || process.env.EMBY_API_KEY

  if (!embyUrl || !embyApiKey) {
    logger.info('[getEmbyServiceForUser] Configuration Emby manquante')
    return null
  }

  return new EmbyService(embyUrl, embyApiKey)
}

export async function getPlexServiceForUser() {
  const { plex_url: plexUrl, plex_token: plexToken } = await readSettings(['plex_url', 'plex_token'])

  if (!plexUrl || !plexToken) {
    logger.info('[getPlexServiceForUser] Configuration Plex manquante')
    return null
  }

  return new PlexService(plexUrl, plexToken)
}

export async function getJellyfinServiceForUser() {
  const { jellyfin_url: jellyfinUrl, jellyfin_api_key: jellyfinApiKey } = await readSettings(['jellyfin_url', 'jellyfin_api_key'])

  if (!jellyfinUrl) {
    logger.info('[getJellyfinServiceForUser] Configuration Jellyfin manquante')
    return null
  }

  return new JellyfinService(jellyfinUrl, jellyfinApiKey)
}

/**
 * Retourne le service média principal (Emby OU Jellyfin) selon ce qui est configuré.
 * Comme Jellyfin est un fork d'Emby, l'API est compatible — on utilise EmbyService
 * dans les deux cas pour bénéficier de toutes les méthodes.
 */
export async function getMediaServerServiceForUser() {
  // Une seule requête pour Emby + Jellyfin
  const s = await readSettings(['emby_url', 'emby_api_key', 'jellyfin_url', 'jellyfin_api_key'])

  const embyUrl = s.emby_url || process.env.EMBY_URL
  const embyApiKey = s.emby_api_key || process.env.EMBY_API_KEY
  if (embyUrl && embyApiKey) return new EmbyService(embyUrl, embyApiKey)
  logger.info('[getEmbyServiceForUser] Configuration Emby manquante')

  // Jellyfin fallback: utiliser EmbyService avec les settings Jellyfin (API compatible)
  if (!s.jellyfin_url) return null

  return new EmbyService(s.jellyfin_url, s.jellyfin_api_key, true, 'jellyfin')
}

/**
 * Serveur Emby ou Jellyfin à lire pour l'utilisateur connecté : celui de sa médiathèque
 * (getLibraryServer, qui suit son compte), sinon le serveur média configuré. Pour tout ce qui lit
 * la bibliothèque d'un compte (fiche, favoris, images) ; son compte dessus :
 * getMediaServerUserId(dbUser, service.flavor).
 */
export async function getUserMediaServer(): Promise<EmbyService | null> {
  return (await getLibraryServer())?.service ?? (await getMediaServerServiceForUser())
}

/** Plateformes lues par l'API Emby (Jellyfin via l'API compatible) */
export type LibrarySource = 'emby' | 'jellyfin'

/**
 * Serveur Emby ou Jellyfin d'une plateforme de connexion : son adresse (pour ouvrir le média dans
 * son lecteur) et le service qui le lit. Null si cette plateforme n'est pas configurée. Contrairement
 * à getMediaServerServiceForUser, Jellyfin n'est jamais écarté au profit d'Emby.
 */
export async function getPlatformServer(type: LibrarySource): Promise<{ service: EmbyService; url: string } | null> {
  const s = await readSettings(['emby_url', 'emby_api_key', 'jellyfin_url', 'jellyfin_api_key'])
  if (type === 'jellyfin') {
    return s.jellyfin_url
      ? { service: new EmbyService(s.jellyfin_url, s.jellyfin_api_key, true, 'jellyfin'), url: s.jellyfin_url }
      : null
  }
  const url = s.emby_url || process.env.EMBY_URL
  const apiKey = s.emby_api_key || process.env.EMBY_API_KEY
  return url && apiKey ? { service: new EmbyService(url, apiKey), url } : null
}

/**
 * Plateformes dont MediaHub sait afficher la bibliothèque : Onyx passe par la clé d'intégration,
 * Plex par le jeton du serveur
 */
export type LibraryPlatform = LibrarySource | 'onyx' | 'plex'

const LIBRARY_KEYS = ['library_source', 'emby_url', 'emby_api_key', 'jellyfin_url', 'jellyfin_api_key', 'onyx_url', 'player_integration_api_key', 'plex_url', 'plex_token'] as const

function resolveLibrary(s: Record<(typeof LIBRARY_KEYS)[number], string>, account: LibraryPlatform | null) {
  const embyUrl = s.emby_url || process.env.EMBY_URL
  const embyApiKey = s.emby_api_key || process.env.EMBY_API_KEY
  const emby = embyUrl && embyApiKey ? { service: new EmbyService(embyUrl, embyApiKey), type: 'emby' as const } : null
  const jellyfin = s.jellyfin_url
    ? { service: new EmbyService(s.jellyfin_url, s.jellyfin_api_key, true, 'jellyfin'), type: 'jellyfin' as const }
    : null
  const onyx = !!(s.onyx_url && (s.player_integration_api_key || process.env.PLAYER_INTEGRATION_API_KEY))
  const plex = !!(s.plex_url && s.plex_token)
  let platform: LibraryPlatform | null
  // La plateforme du compte connecté passe avant le choix de l'administrateur, si elle est configurée
  if (account === 'onyx' && onyx) platform = 'onyx'
  else if (account === 'plex' && plex) platform = 'plex'
  else if (account === 'jellyfin' && jellyfin) platform = 'jellyfin'
  else if (account === 'emby' && emby) platform = 'emby'
  else if (s.library_source === 'onyx' && onyx) platform = 'onyx'
  else if (s.library_source === 'plex' && plex) platform = 'plex'
  else if (s.library_source === 'jellyfin' && jellyfin) platform = 'jellyfin'
  else if (s.library_source === 'emby' && emby) platform = 'emby'
  else platform = emby ? 'emby' : jellyfin ? 'jellyfin' : onyx ? 'onyx' : plex ? 'plex' : null
  return { platform, emby, jellyfin }
}

/**
 * Plateforme du compte connecté (sauf compte d'un groupe « comptes liés »). Hors requête (tâches de
 * fond) ou sans session : null, le réglage de l'administrateur s'applique.
 */
async function accountLibraryPlatform(): Promise<LibraryPlatform | null> {
  try {
    // Import dynamique : playback-platform importe ce module
    const { getLibraryAccountPlatform } = await import('./playback-platform')
    return await getLibraryAccountPlatform()
  } catch {
    return null
  }
}

async function resolveLibraryForUser() {
  const [settings, account] = await Promise.all([readSettings(LIBRARY_KEYS), accountLibraryPlatform()])
  return resolveLibrary(settings, account)
}

/**
 * Plateforme dont « Ma médiathèque » affiche la bibliothèque : celle du compte connecté (connexion
 * Jellyfin -> bibliothèque Jellyfin, Plex -> Plex…) si elle est configurée, sinon celle choisie dans
 * les réglages (library_source) : toujours le cas d'un compte d'un groupe « comptes liés ». Sinon la
 * seule configurée (Emby, Jellyfin, Onyx, puis Plex).
 */
export async function getLibraryPlatform(): Promise<LibraryPlatform | null> {
  return (await resolveLibraryForUser()).platform
}

/**
 * Serveur Emby ou Jellyfin de la médiathèque. Null quand c'est Onyx : son catalogue se lit par
 * lib/services/onyx-directory.ts, et l'historique ou les favoris d'Emby n'y correspondraient pas.
 */
export async function getLibraryServer(): Promise<{ service: EmbyService; type: LibrarySource } | null> {
  const { platform, emby, jellyfin } = await resolveLibraryForUser()
  if (platform === 'emby') return emby
  if (platform === 'jellyfin') return jellyfin
  return null
}

/** Compte de l'utilisateur sur la plateforme de la bibliothèque (l'autre en secours, comme avant) */
export function getLibraryUserId(
  dbUser: { embyUserId?: string | null; jellyfinUserId?: string | null } | null | undefined,
  type: LibrarySource
): string | null {
  if (!dbUser) return null
  return type === 'jellyfin'
    ? dbUser.jellyfinUserId || dbUser.embyUserId || null
    : dbUser.embyUserId || dbUser.jellyfinUserId || null
}

/**
 * Retourne l'ID utilisateur du serveur média (embyUserId ou jellyfinUserId). Avec `type` (le
 * `flavor` du service) : le compte de ce serveur-là, comme getLibraryUserId.
 */
export function getMediaServerUserId(
  dbUser: { embyUserId?: string | null; jellyfinUserId?: string | null } | null | undefined,
  type?: LibrarySource
): string | null {
  if (!dbUser) return null
  if (type) return getLibraryUserId(dbUser, type)
  return dbUser.embyUserId || dbUser.jellyfinUserId || null
}

/**
 * Retourne le type de serveur média configuré ('emby' | 'jellyfin' | null).
 */
export async function getMediaServerType(): Promise<'emby' | 'jellyfin' | null> {
  const s = await readSettings(['emby_url', 'jellyfin_url'])
  if (s.emby_url) return 'emby'
  if (s.jellyfin_url) return 'jellyfin'
  return null
}

export async function getTmdbServiceForUser() {
  return await getTmdbService()
}

export async function getRadarrServiceForUser() {
  return await getRadarrService()
}

export async function getSonarrServiceForUser() {
  return await getSonarrService()
}

export async function getStorageServiceForUser() {
  const protocol = (await getSetting('storage_protocol')) || 'smb'
  const host = await getSetting('storage_host')

  logger.info('[getStorageServiceForUser] Protocol:', protocol, 'Host:', host)

  if (protocol === 'ftp') {
    const ftpService = await getFtpService()
    logger.info('[getStorageServiceForUser] Returning FTP service:', ftpService ? 'configured' : 'null')
    return ftpService
  }

  if (protocol === 'local') {
    const localService = await getLocalService()
    logger.info('[getStorageServiceForUser] Returning Local service:', localService ? 'configured' : 'null')
    return localService
  }

  const smbService = await getSmbService()
  logger.info('[getStorageServiceForUser] Returning SMB service:', smbService ? 'configured' : 'null')
  return smbService
}

export async function getSmbServiceForUser() {
  return getStorageServiceForUser()
}

export async function getProwlarrServiceForUser() {
  return await getProwlarrService()
}
