import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { isPlaybackPlatform, playbackPlatform, type PlayTarget, type PlaybackPlatform } from '@/lib/playback-platform'
import { getSession } from './index'
import { getMediaServerType, getPlatformServer } from './service-factories'

/**
 * Plateforme de lecture de l'utilisateur courant : celle de sa connexion. Session ouverte avant
 * que la connexion ne soit retenue, ou compte local : son compte lié (Onyx, Emby, Jellyfin, Plex),
 * sinon le serveur média configuré.
 */
export async function getPlaybackPlatform(): Promise<PlaybackPlatform> {
  const session = await getSession()
  const login = session?.user?.loginProvider
  if (isPlaybackPlatform(login)) return playbackPlatform(login)

  const id = parseInt(session?.user?.id ?? '')
  if (!isNaN(id)) {
    try {
      const row = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { onyxUserId: true, embyUserId: true, jellyfinUserId: true, plexUserId: true },
      })
      if (row?.onyxUserId) return playbackPlatform('onyx')
      if (row?.embyUserId) return playbackPlatform('emby')
      if (row?.jellyfinUserId) return playbackPlatform('jellyfin')
      if (row?.plexUserId) return playbackPlatform('plex')
    } catch {
      // Base injoignable : repli sur le serveur configuré
    }
  }
  return playbackPlatform((await getMediaServerType()) ?? 'emby')
}

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
