import { NextResponse } from 'next/server'
import { apiError, authenticate, canInteractiveSearch, parseId, parseMediaType } from '@/lib/integrations/player-v1'
import {
  grabRelease,
  searchReleases,
  tvdbIdOf,
  usesSorraa,
  type ChosenRelease,
  type ReleaseTarget,
} from '@/lib/services/interactive-search'
import { logAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/** Un numero de saison ou d'episode : entier >= 0 (la saison 0 est celle des speciaux), ou undefined. */
function parseNumber(raw: unknown): number | undefined | null {
  if (raw === null || raw === undefined || raw === '') return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : null
}

/** La cible visee : un film, une saison, ou un episode. Un episode sans saison n'existe pas. */
function parseTarget(input: { tmdbId: unknown; mediaType: unknown; season: unknown; episode: unknown }): ReleaseTarget | null {
  const tmdbId = parseId(String(input.tmdbId ?? ''))
  const mediaType = parseMediaType(input.mediaType)
  const seasonNumber = parseNumber(input.season)
  const episodeNumber = parseNumber(input.episode)
  if (!tmdbId || !mediaType || seasonNumber === null || episodeNumber === null) return null
  if (mediaType === 'movie' && (seasonNumber !== undefined || episodeNumber !== undefined)) return null
  if (episodeNumber !== undefined && seasonNumber === undefined) return null
  return { mediaType, tmdbId, seasonNumber, episodeNumber }
}

/**
 * Recherche interactive : les releases pour un film, une saison ou un
 * episode. ?tmdbId=&type=movie|tv&season=&episode= (season seule : la
 * saison entiere ; season et episode : un episode). Reserve a
 * interactive_search.
 *
 * `manager` dit qui a cherche : `sorraa` (releases jugees, `accepted` et
 * `rejections` renseignes, `id` = jeton valable 30 minutes) ou `arr`
 * (Prowlarr, `id` = guid de l'indexeur, avec les adresses de telechargement).
 */
export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (!canInteractiveSearch(auth.ability)) return apiError(403, 'Forbidden')

  const params = new URL(request.url).searchParams
  const target = parseTarget({
    tmdbId: params.get('tmdbId'),
    mediaType: params.get('type'),
    season: params.get('season'),
    episode: params.get('episode'),
  })
  if (!target) return apiError(400, 'Invalid media')

  try {
    const found = await searchReleases(target)
    if ('error' in found) return apiError(found.status ?? 503, found.error)
    return NextResponse.json({ manager: found.manager, releases: found.results })
  } catch (err) {
    return apiError(502, (err as Error).message)
  }
}

/**
 * Envoie une release au telechargement :
 * { tmdbId, mediaType, season?, episode?, release: { id?, guid?, indexerId?, title?, downloadUrl?, magnetUrl?, protocol?, publishDate?, indexer?, size? } }.
 *
 * Avec sorraa, `release.id` (le jeton de la liste) suffit : sorraa a gardé la release.
 * Avec Radarr/Sonarr, il faut en plus `title` et une adresse, que Sonarr ne
 * connait pas ; le film, la saison ou l'episode vise est surveille avant l'envoi.
 */
export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (!auth.ok) return auth.response
  if (!canInteractiveSearch(auth.ability)) return apiError(403, 'Forbidden')

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const release = (body?.release ?? null) as Record<string, unknown> | null
  const target = body ? parseTarget({ tmdbId: body.tmdbId, mediaType: body.mediaType, season: body.season, episode: body.episode }) : null
  const text = (value: unknown) => (typeof value === 'string' ? value : '')
  // `guid` est l'ancien nom de `id` : un Onyx d'avant sorraa n'envoie que lui.
  const id = text(release?.id) || text(release?.guid)
  if (!target || !release || !id) return apiError(400, 'Missing parameters')

  const chosen: ChosenRelease = { id, indexerId: Number(release.indexerId) || 0 }
  try {
    if (!(await usesSorraa(target.mediaType))) {
      const title = text(release.title)
      const url = [release.downloadUrl, release.magnetUrl].map(text).find((value) => value !== '')
      if (!title || !url || !Number.isInteger(Number(release.indexerId))) return apiError(400, 'Missing parameters')
      chosen.info = {
        title,
        downloadUrl: url,
        protocol: text(release.protocol),
        publishDate: text(release.publishDate) || new Date().toISOString(),
        indexer: text(release.indexer),
        size: typeof release.size === 'number' ? release.size : undefined,
        guid: id,
      }
      // Sonarr ne connait une serie que par son identifiant TVDB.
      if (target.mediaType === 'tv') {
        const tvdbId = await tvdbIdOf(target.tmdbId)
        if (!tvdbId) return apiError(404, 'Could not find TVDB ID for this series')
        target.tvdbId = tvdbId
      }
    }

    const result = await grabRelease(target, chosen)
    if (result.error) return apiError(result.status ?? 503, result.error)
    if (result.success === false) {
      // Le message de Radarr/Sonarr est en anglais : apiError ne le garde que précédé d'une phrase française.
      return apiError(502, `Radarr ou Sonarr a refusé la release${result.message ? ` : ${result.message}` : '.'}`)
    }

    await logAction(auth.userId, 'MEDIA_RELEASE_GRAB', 'Media', String(target.tmdbId), {
      via: 'player-api',
      title: text(release.title) || undefined,
      season: target.seasonNumber,
      episode: target.episodeNumber,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return apiError(502, (err as Error).message)
  }
}
