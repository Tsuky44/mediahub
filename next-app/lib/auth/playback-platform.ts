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
import { readSettings } from '@/lib/settings'
import { getSession } from './index'
import { getLinkedAccounts, type PlatformAccountIds } from './account-group'
import { getLibraryPlatform, getMediaServerType, getPlatformServer } from './service-factories'

/**
 * Plateforme de lecture de l'utilisateur courant (« Lire dans … », « Disponible sur … ») : celle de
 * « Ma médiathèque », pour que les boutons et la bibliothèque affichée concordent. C'est la
 * plateforme de connexion, sauf quand le réglage de l'administrateur s'applique
 * (getLibraryAccountPlatform). En secours : la plateforme du compte, puis le serveur média configuré.
 */
export async function getPlaybackPlatform(): Promise<PlaybackPlatform> {
  const id =
    (await getLibraryAccountPlatform()) ??
    (await getLibraryPlatform().catch(() => null)) ??
    (await getAccountPlatform()) ??
    (await getMediaServerType()) ??
    'emby'
  return playbackPlatform(id)
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

const ACCOUNT_KEY: Record<PlaybackPlatformId, keyof PlatformAccountIds> = {
  emby: 'embyUserId',
  jellyfin: 'jellyfinUserId',
  plex: 'plexUserId',
  onyx: 'onyxUserId',
}

/**
 * Plateforme dont la médiathèque du compte connecté s'affiche : celle de sa connexion. Null (le
 * réglage « Ma médiathèque » de l'administrateur s'applique) pour un compte d'un groupe « comptes
 * liés » (plusieurs plateformes pour une même personne), ou pour un compte qui a aussi un compte sur
 * la plateforme choisie dans ce réglage : connecté avec Onyx mais lié à Jellyfin, réglage Jellyfin
 * -> Jellyfin.
 */
export const getLibraryAccountPlatform = cache(async (): Promise<PlaybackPlatformId | null> => {
  const session = await getSession()
  const id = parseInt(session?.user?.id ?? '')
  if (!isNaN(id)) {
    if (await getLinkedAccounts(id).catch(() => null)) return null
    const account = await getAccountPlatform()
    try {
      const { library_source: chosen } = await readSettings(['library_source'] as const)
      if (account && isPlaybackPlatform(chosen) && chosen !== account) {
        const row = await db.query.users.findFirst({
          where: eq(users.id, id),
          columns: { embyUserId: true, jellyfinUserId: true, plexUserId: true, onyxUserId: true },
        })
        if (row?.[ACCOUNT_KEY[chosen]]) return null
      }
    } catch {
      // Base injoignable : plateforme de connexion
    }
    return account
  }
  return getAccountPlatform()
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
