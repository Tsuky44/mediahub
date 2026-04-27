import 'server-only'
import {
  getEmbyServiceForUser,
  getJellyfinServiceForUser,
  getPlexServiceForUser,
  getTmdbServiceForUser,
} from '@/lib/auth'
import type { MediaType } from '../_types/media-page'

/**
 * Resultat de la resolution d'un item externe (Emby/Plex/Jellyfin) :
 * - `redirect` : l'item a ete relie a un id TMDB et la page doit rediriger.
 * - `not-found` : aucun mapping trouve, on doit afficher la page d'erreur.
 */
export type ExternalItemResolution =
  | {
      kind: 'redirect'
      tmdbId: number
      mediaType: MediaType
    }
  | {
      kind: 'not-found'
      providerName: string
      itemName?: string
    }

/**
 * Determine si l'identifiant fourni doit etre traite comme un item externe
 * (sources Emby/Plex/Jellyfin, ou id non numerique long).
 */
export function isExternalMediaId(id: string, source?: string): boolean {
  const normalizedSource = source ? source.toLowerCase() : undefined
  if (normalizedSource && ['emby', 'plex', 'jellyfin'].includes(normalizedSource)) {
    return true
  }
  return id.length > 15 || isNaN(Number(id))
}

/**
 * Recupere les details d'un item depuis le service Plex/Jellyfin/Emby
 * et normalise le format pour exposer ProviderIds + Name + Type.
 */
async function fetchExternalItem(
  id: string,
  normalizedSource: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (normalizedSource === 'plex') {
    const plexService = await getPlexServiceForUser()
    if (!plexService) return null
    try {
      const item = await plexService.getItemDetails(id)
      if (!item) return null
      const guids = Array.isArray(item.Guid) ? item.Guid : []
      const tmdbGuid = guids.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (g: any) => g.id && g.id.startsWith('tmdb://')
      )
      const imdbGuid = guids.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (g: any) => g.id && g.id.startsWith('imdb://')
      )
      const tvdbGuid = guids.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (g: any) => g.id && g.id.startsWith('tvdb://')
      )
      item.ProviderIds = {
        Tmdb: tmdbGuid ? tmdbGuid.id.replace('tmdb://', '') : null,
        Imdb: imdbGuid ? imdbGuid.id.replace('imdb://', '') : null,
        Tvdb: tvdbGuid ? tvdbGuid.id.replace('tvdb://', '') : null,
      }
      item.Name = item.title
      item.Type = item.type === 'movie' ? 'Movie' : 'Series'
      return item
    } catch (e) {
      console.error('[MediaPage] Plex fetch error:', e)
      return null
    }
  }

  if (normalizedSource === 'jellyfin') {
    const jellyfinService = await getJellyfinServiceForUser()
    if (!jellyfinService) return null
    try {
      return await jellyfinService.getItemDetails(id)
    } catch (e) {
      console.error('[MediaPage] Jellyfin fetch error:', e)
      return null
    }
  }

  // Default: Emby
  const embyService = await getEmbyServiceForUser()
  if (!embyService) return null
  try {
    const item = await embyService.getItemDetails(id)
    console.log(
      `[MediaPage] Emby item found: ${item?.Name}, ProviderIds:`,
      item?.ProviderIds
    )
    return item
  } catch {
    return null
  }
}

/**
 * Tente de resoudre un id TMDB depuis les ProviderIds (Tmdb -> Imdb -> Tvdb).
 */
async function resolveTmdbIdFromProviderIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any
): Promise<number | string | null> {
  const tmdbId =
    item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb || item.ProviderIds?.TMDB
  if (tmdbId) return tmdbId

  const imdbId =
    item.ProviderIds?.Imdb || item.ProviderIds?.imdb || item.ProviderIds?.IMDB
  const tvdbId =
    item.ProviderIds?.Tvdb || item.ProviderIds?.tvdb || item.ProviderIds?.TVDB
  if (!imdbId && !tvdbId) return null

  const tmdbService = await getTmdbServiceForUser()
  if (!tmdbService) return null

  if (imdbId) {
    const findResult = await tmdbService.findByExternalId(imdbId, 'imdb_id')
    const foundItem =
      findResult?.movie_results?.[0] ||
      findResult?.tv_results?.[0] ||
      findResult?.tv_episode_results?.[0]
    if (foundItem) return foundItem.id
  }
  if (tvdbId) {
    const findResult = await tmdbService.findByExternalId(tvdbId, 'tvdb_id')
    const foundItem =
      findResult?.movie_results?.[0] ||
      findResult?.tv_results?.[0] ||
      findResult?.tv_episode_results?.[0]
    if (foundItem) return foundItem.id
  }
  return null
}

/**
 * Tente une recherche fallback sur le nom (depuis searchParams) si aucun id
 * TMDB n'a pu etre derive depuis les ProviderIds.
 */
async function resolveTmdbIdFromName(name: string): Promise<{
  tmdbId: number
  mediaType: MediaType
} | null> {
  const tmdbService = await getTmdbServiceForUser()
  if (!tmdbService) return null
  try {
    const searchResults = await tmdbService.searchMulti(decodeURIComponent(name))
    const bestMatch = searchResults?.results?.[0]
    if (!bestMatch) return null
    console.log(
      `[MediaPage] Fallback found: ${bestMatch.title || bestMatch.name} (${bestMatch.id})`
    )
    return {
      tmdbId: bestMatch.id,
      mediaType: bestMatch.media_type === 'tv' ? 'tv' : 'movie',
    }
  } catch (e) {
    console.error('[MediaPage] Fallback search failed:', e)
    return null
  }
}

/**
 * Resout un item externe vers une cible TMDB, ou retourne `not-found`.
 * N'effectue PAS de redirect : l'appelant decide.
 */
export async function resolveExternalItem(params: {
  id: string
  source?: string
  name?: string
}): Promise<ExternalItemResolution> {
  const { id, source, name } = params
  const normalizedSource = source ? source.toLowerCase() : undefined
  const providerName = normalizedSource
    ? normalizedSource.charAt(0).toUpperCase() + normalizedSource.slice(1)
    : 'Emby'

  console.log(
    `[MediaPage] Processing External item: ${id}, source=${normalizedSource}`
  )

  const item = await fetchExternalItem(id, normalizedSource)

  if (item) {
    const resolved = await resolveTmdbIdFromProviderIds(item)
    if (resolved) {
      return {
        kind: 'redirect',
        tmdbId: Number(resolved),
        mediaType: item?.Type === 'Movie' ? 'movie' : 'tv',
      }
    }
  }

  if (name && name !== 'Unknown') {
    console.log(
      `[MediaPage] External item not found. Trying fallback search for "${name}"...`
    )
    const fallback = await resolveTmdbIdFromName(name)
    if (fallback) {
      return {
        kind: 'redirect',
        tmdbId: fallback.tmdbId,
        mediaType: fallback.mediaType,
      }
    }
  }

  return {
    kind: 'not-found',
    providerName,
    itemName: item?.Name,
  }
}
