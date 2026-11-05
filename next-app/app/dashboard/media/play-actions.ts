'use server'

import { eq } from 'drizzle-orm'
import { getCurrentUser, getPlexServiceForUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getOnyxIntegrationConfig } from '@/lib/integrations/onyx-config'
import { getOnyxDirectory } from '@/lib/services/onyx-directory'

/** Accueil de l'app Plex : quand le média n'est pas retrouvé sur le serveur */
const PLEX_HOME = 'https://app.plex.tv/desktop'

/**
 * Lien « Lire dans Plex » d'un média : sa page dans l'app Plex, retrouvée par titre (titre français
 * puis titre original) et année ; sinon l'accueil de l'app Plex.
 */
export async function getPlexLink(params: {
  title: string
  originalTitle?: string
  year?: number
  mediaType: 'movie' | 'tv'
  /** Élément Plex déjà connu (bibliothèque Plex) : lien direct, sans recherche par titre */
  ratingKey?: string
}): Promise<string> {
  const plex = await getPlexServiceForUser()
  if (!plex) return PLEX_HOME
  if (params.ratingKey && /^\d+$/.test(params.ratingKey)) {
    const direct = await plex.webLinkFor(params.ratingKey)
    if (direct) return direct
  }
  const link = await plex.findWebLink(
    [params.title, params.originalTitle ?? ''],
    params.year,
    params.mediaType === 'movie' ? 'movie' : 'show'
  )
  return link ?? PLEX_HOME
}

/**
 * Lien « Lire dans Onyx » d'un média : la fiche dans l'app web d'Onyx (`?movie=ID` ou `?show=ID`,
 * ADR-0073 d'Onyx), l'id Onyx étant retrouvé par l'id TMDB dans la bibliothèque. Titre absent ou
 * Onyx injoignable : l'accueil de l'app web. Null sans adresse Onyx.
 */
export async function getOnyxLink(params: { tmdbId: number; mediaType: 'movie' | 'tv' }): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const { url } = await getOnyxIntegrationConfig()
  if (!url) return null
  const home = `${url.replace(/\/+$/, '')}/`

  try {
    const directory = await getOnyxDirectory()
    if (!directory) return home
    const account = user.email
      ? await db.query.users.findFirst({ where: eq(users.email, user.email), columns: { onyxUserId: true } })
      : undefined
    const type = params.mediaType === 'movie' ? 'movie' : 'show'
    const item = (await directory.listLibrary(account?.onyxUserId)).find(
      (i) => i.type === type && i.tmdb_id === params.tmdbId
    )
    return item ? `${home}?${type}=${item.id}` : home
  } catch {
    return home
  }
}
