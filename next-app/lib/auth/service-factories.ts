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

  return new EmbyService(s.jellyfin_url, s.jellyfin_api_key)
}

/**
 * Retourne l'ID utilisateur du serveur média (embyUserId ou jellyfinUserId).
 */
export function getMediaServerUserId(dbUser: { embyUserId?: string | null; jellyfinUserId?: string | null } | null | undefined): string | null {
  if (!dbUser) return null
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
