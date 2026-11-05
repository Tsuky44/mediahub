'use server'

import { getPlexServiceForUser } from '@/lib/auth'

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
}): Promise<string> {
  const plex = await getPlexServiceForUser()
  if (!plex) return PLEX_HOME
  const link = await plex.findWebLink(
    [params.title, params.originalTitle ?? ''],
    params.year,
    params.mediaType === 'movie' ? 'movie' : 'show'
  )
  return link ?? PLEX_HOME
}
