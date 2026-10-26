import 'server-only'
import { cache } from 'react'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'

const CONFIG_KEYS = [
  'emby_url',
  'jellyfin_url',
  'qbittorrent_url',
  'smb_host',
  'docker_host',
  'unraid_url',
  'welcome_message_enabled',
]

export interface DashboardConfig {
  mediaServerUrl: string | null
  hasDownloads: boolean
  hasDocker: boolean
  welcomeEnabled: boolean
}

/**
 * Configuration commune au layout et aux pages du dashboard.
 * Mémoïsée par requête : le layout et la page partagent la même lecture.
 */
export const getDashboardConfig = cache(async (): Promise<DashboardConfig> => {
  const rows = await db.query.settings.findMany({
    where: inArray(settings.key, CONFIG_KEYS),
    columns: { key: true, value: true },
  })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const has = (key: string) => !!byKey.get(key)

  return {
    mediaServerUrl: byKey.get('emby_url') || byKey.get('jellyfin_url') || null,
    hasDownloads: has('qbittorrent_url') || has('smb_host'),
    hasDocker: has('docker_host') || has('unraid_url'),
    // Activé par défaut tant que le setting n'a jamais été enregistré
    welcomeEnabled: byKey.has('welcome_message_enabled')
      ? byKey.get('welcome_message_enabled') === 'true'
      : true,
  }
})
