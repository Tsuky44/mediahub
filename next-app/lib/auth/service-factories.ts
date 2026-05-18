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
