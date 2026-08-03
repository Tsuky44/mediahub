import { db } from '@/lib/db/drizzle'
import { settings as settingsTable } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
import { getSetting } from '@/lib/settings'
import { logger } from '@/lib/logger'

export async function getEmbyServiceForUser() {
  const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'emby_url'))
  const [keySetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'emby_api_key'))

  const embyUrl = urlSetting?.value || process.env.EMBY_URL
  const embyApiKey = keySetting?.value || process.env.EMBY_API_KEY

  if (!embyUrl || !embyApiKey) {
    logger.info('[getEmbyServiceForUser] Configuration Emby manquante')
    return null
  }

  return new EmbyService(embyUrl, embyApiKey)
}

export async function getPlexServiceForUser() {
  const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'plex_url'))
  const [tokenSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'plex_token'))

  const plexUrl = urlSetting?.value || ''
  const plexToken = tokenSetting?.value || ''

  if (!plexUrl || !plexToken) {
    logger.info('[getPlexServiceForUser] Configuration Plex manquante')
    return null
  }

  return new PlexService(plexUrl, plexToken)
}

export async function getJellyfinServiceForUser() {
  const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_url'))
  const [keySetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_api_key'))

  const jellyfinUrl = urlSetting?.value || ''
  const jellyfinApiKey = keySetting?.value || ''

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
  const embyService = await getEmbyServiceForUser()
  if (embyService) return embyService

  // Jellyfin fallback: utiliser EmbyService avec les settings Jellyfin (API compatible)
  const [jellyfinUrlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_url'))
  const [jellyfinKeySetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_api_key'))

  const jellyfinUrl = jellyfinUrlSetting?.value || ''
  const jellyfinApiKey = jellyfinKeySetting?.value || ''

  if (!jellyfinUrl) return null

  return new EmbyService(jellyfinUrl, jellyfinApiKey)
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
  const [embyUrl] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'emby_url'))
  if (embyUrl?.value) return 'emby'

  const [jellyfinUrl] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_url'))
  if (jellyfinUrl?.value) return 'jellyfin'

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
