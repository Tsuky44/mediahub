import 'server-only'
import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import {
  isPlaybackPlatform,
  playbackPlatform,
  type PlayTarget,
  type PlaybackPlatform,
  type PlaybackPlatformId,
} from '@/lib/playback-platform'
import { getSession } from './index'
import { getMediaServerType, getPlatformServer } from './service-factories'

/**
 * Plateforme de lecture de l'utilisateur courant : celle de sa connexion. Session ouverte avant
 * que la connexion ne soit retenue, ou compte local : son compte lié (Onyx, Emby, Jellyfin, Plex),
 * sinon le serveur média configuré.
 */
export async function getPlaybackPlatform(): Promise<PlaybackPlatform> {
  return playbackPlatform((await getAccountPlatform()) ?? (await getMediaServerType()) ?? 'emby')
}

/**
 * Plateforme du compte connecté (connexion, sinon compte lié), ou null : pas de session, ou
 * compte local sans compte lié. Une fois par requête.
 */
export const getAccountPlatform = cache(async (): Promise<PlaybackPlatformId | null> => {
  const session = await getSession()
  const login = session?.user?.loginProvider
  if (isPlaybackPlatform(login)) return login

  const id = parseInt(session?.user?.id ?? '')
  if (!isNaN(id)) {
    try {
      const row = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { onyxUserId: true, embyUserId: true, jellyfinUserId: true, plexUserId: true },
      })
      if (row?.onyxUserId) return 'onyx'
      if (row?.embyUserId) return 'emby'
      if (row?.jellyfinUserId) return 'jellyfin'
      if (row?.plexUserId) return 'plex'
    } catch {
      // Base injoignable : repli sur le serveur configuré
    }
  }
  return null
})

/**
 * Retrouve un média sur le serveur de la plateforme de connexion (Emby ou Jellyfin), avec le compte
 * de l'utilisateur dessus : son adresse, l'identifiant du serveur et de l'élément. Null si cette
 * plateforme n'est pas configurée, si l'utilisateur n'y a pas de compte ou si le média n'y est pas.
 */
export async function findPlayTarget(
  platform: 'emby' | 'jellyfin',
  dbUser: { embyUserId?: string | null; jellyfinUserId?: string | null } | null | undefined,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<PlayTarget | null> {
  const server = await getPlatformServer(platform)
  // Compte propre à cette plateforme : l'identifiant de l'autre serveur n'y désigne personne
  const userId = platform === 'jellyfin' ? dbUser?.jellyfinUserId : dbUser?.embyUserId
  if (!server || !userId) return null

  const item = (await server.service.getItemByTmdbId(
    userId,
    tmdbId,
    mediaType === 'movie' ? 'Movie' : 'Series'
  )) as { Id?: string; ServerId?: string } | null
  if (!item?.Id) return null

  return {
    serverUrl: server.url.split('/web/')[0].replace(/\/$/, ''),
    serverId: item.ServerId ?? (await server.service.getServerId()),
    itemId: String(item.Id),
  }
}
