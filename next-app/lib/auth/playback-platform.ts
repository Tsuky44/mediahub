import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { isPlaybackPlatform, playbackPlatform, type PlaybackPlatform } from '@/lib/playback-platform'
import { getSession } from './index'
import { getMediaServerType } from './service-factories'

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
