import { getProwlarrServiceForUser, getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getManagerKind, type ManagerKind } from '@/lib/download-managers'
import { getSorraaService, SorraaError, toSorraaKind, type SorraaService } from '@/lib/services/sorraa'
import { findUnit, releaseFromSorraa } from '@/lib/services/sorraa-releases'

/**
 * Recherche interactive : lister les releases qu'offrent les indexeurs pour un
 * film, une saison ou un episode, puis en envoyer une au telechargement.
 *
 * Deux gestionnaires, comme pour les demandes (`getDownloadManager`) :
 *  - sorraa, quand l'admin l'a choisi pour ce type de media : il cherche et
 *    juge lui-même les releases, et prend celle qu'on lui designe par son jeton ;
 *  - Radarr/Sonarr sinon : Prowlarr liste, Radarr/Sonarr recoivent la release.
 *
 * L'API du lecteur (`/api/integrations/player/v1/releases`) passe par
 * `searchReleases` et `grabRelease`, qui choisissent. L'interface web de la
 * fiche reste sur `searchArrReleases` et `grabArrRelease` : sa fenetre de
 * recherche envoie des adresses de telechargement, que sorraa ne rend jamais.
 * Chacun juge le droit `interactive_search` avant d'appeler.
 */

const MOVIE_CATEGORIES = [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 8000]
const TV_CATEGORIES = [5000, 5010, 5020, 5030, 5040, 5045, 5050, 5060, 5070, 5080]

export type MediaKind = 'movie' | 'tv'

export interface ReleaseTarget {
  mediaType: MediaKind
  tmdbId: number
  tvdbId?: number
  seasonNumber?: number
  episodeNumber?: number
}

export interface MediaRelease {
  /** Ce qu'on rend pour choisir la release : le guid d'un indexeur, ou le jeton de sorraa. */
  id: string
  guid: string
  title: string
  size: number
  indexer: string
  indexerId: number
  publishDate: string
  seeders?: number
  leechers?: number
  age: number
  downloadUrl?: string
  magnetUrl?: string
  protocol: string
  customFormatScore: number
  rejections: string[]
  /** Le verdict de sorraa ; absent avec Radarr/Sonarr, qui ne jugent pas avant l'envoi. */
  accepted?: boolean
}

// Un `type` et non une interface : Radarr/Sonarr prennent un Record<string, unknown>.
export type ReleaseInfo = {
  title: string
  downloadUrl: string
  protocol: string
  publishDate: string
  indexer: string
  size?: number
  guid?: string
}

/** Un echec avec le statut HTTP a rendre (503 par defaut : un service pas pret). */
export type ReleaseFailure = { error: string; status?: number }
export type ReleaseSearchResult = { manager: ManagerKind; results: MediaRelease[] } | ReleaseFailure
export type ReleaseGrabResult = { success?: boolean; message?: string; error?: string; status?: number }

const pad = (n: number) => (n < 10 ? `0${n}` : String(n))

// --- sorraa ----------------------------------------------------------------

/** Les erreurs de sorraa que l'utilisateur peut comprendre, en francais ; le reste garde le message de sorraa. */
function sorraaFailure(e: unknown, fallback: string): ReleaseFailure {
  if (!(e instanceof SorraaError)) throw e
  if (e.code === 'release_expired' || e.status === 410) {
    return { error: 'La release a expiré : relancez la recherche.', status: 410 }
  }
  if (e.code === 'no_download_client') {
    return { error: 'Aucun client de téléchargement n’est réglé dans sorraa.', status: 409 }
  }
  if (e.status === 404) return { error: `${fallback} est introuvable chez sorraa.`, status: 404 }
  if (e.status === 503) return { error: 'sorraa ne répond pas.', status: 503 }
  return { error: `sorraa a refusé la demande : ${e.message}`, status: 502 }
}

async function searchSorraa(sorraa: SorraaService, target: ReleaseTarget): Promise<ReleaseSearchResult> {
  const kind = toSorraaKind(target.mediaType)
  try {
    // Un titre jamais demande n'est pas encore chez sorraa : on l'y ajoute sans rien chercher.
    const media = (await sorraa.findMedia(kind, target.tmdbId)) ?? (await sorraa.addMedia(kind, target.tmdbId))
    const unit = findUnit(media, target)
    if (!unit) {
      // apiError ne garde un message que s'il est lisiblement français (accent ou article).
      return { error: target.episodeNumber === undefined ? 'La saison est introuvable chez sorraa.' : 'L’épisode est introuvable chez sorraa.', status: 404 }
    }
    const found = await sorraa.searchReleases(media.id, unit.id)
    return { manager: 'sorraa', results: found.map((r) => releaseFromSorraa(r)) }
  } catch (e) {
    return sorraaFailure(e, 'Le titre')
  }
}

async function grabSorraa(sorraa: SorraaService, releaseId: string): Promise<ReleaseGrabResult> {
  try {
    await sorraa.grabRelease(releaseId)
    return { success: true }
  } catch (e) {
    return sorraaFailure(e, 'La release')
  }
}

// --- Radarr / Sonarr -------------------------------------------------------

/** La requete Prowlarr d'une cible : identifiant externe, puis SxxExx quand on vise une saison ou un episode. */
async function queryFor(target: ReleaseTarget): Promise<{ query: string; categories: number[] } | { error: string }> {
  const tmdb = await getTmdbServiceForUser()
  if (!tmdb) return { error: 'Service TMDB non disponible' }

  if (target.mediaType === 'movie') {
    const externalIds = await tmdb.getExternalIds('movie', target.tmdbId)
    return {
      categories: MOVIE_CATEGORIES,
      query: externalIds?.imdb_id ? `{imdb:${externalIds.imdb_id}}` : `{tmdb:${target.tmdbId}}`,
    }
  }

  let tvdbId = target.tvdbId
  if (!tvdbId) tvdbId = (await tmdb.getExternalIds('tv', target.tmdbId))?.tvdb_id
  if (!tvdbId) return { error: 'TVDB ID introuvable pour cette série' }

  let query = `{tvdb:${tvdbId}}`
  if (typeof target.seasonNumber === 'number' && typeof target.episodeNumber === 'number') {
    query += ` S${pad(target.seasonNumber)}E${pad(target.episodeNumber)}`
  } else if (typeof target.seasonNumber === 'number') {
    query += ` S${pad(target.seasonNumber)}`
  }
  return { query, categories: TV_CATEGORIES }
}

export async function searchArrReleases(target: ReleaseTarget): Promise<ReleaseSearchResult> {
  const prowlarr = await getProwlarrServiceForUser()
  if (!prowlarr) return { error: 'Prowlarr non configuré' }

  const built = await queryFor(target)
  if ('error' in built) return built

  const results = await prowlarr.search(built.query, undefined, built.categories)
  return {
    manager: 'arr',
    results: results.map((r) => ({
      id: r.guid,
      guid: r.guid,
      title: r.title,
      size: r.size,
      indexer: r.indexer,
      indexerId: r.indexerId,
      publishDate: r.publishDate,
      seeders: r.seeders,
      leechers: r.leechers,
      age: r.age,
      downloadUrl: r.downloadUrl,
      magnetUrl: r.magnetUrl,
      protocol: r.protocol,
      customFormatScore: 0, // Prowlarr ne le donne pas
      rejections: [],
    })),
  }
}

/**
 * Envoie une release a Radarr/Sonarr, qui la telecharge et l'importe. Le film
 * ou l'episode visé est d'abord surveillé, sans quoi Sonarr refuserait l'import.
 */
export async function grabArrRelease(
  target: ReleaseTarget,
  guid: string,
  indexerId: number,
  releaseInfo?: ReleaseInfo,
): Promise<ReleaseGrabResult> {
  if (target.mediaType === 'movie') {
    const radarr = await getRadarrServiceForUser()
    if (!radarr) return { error: 'Radarr non configuré' }

    const profiles = await radarr.getProfiles()
    const rootFolders = await radarr.getRootFolders()
    await radarr.addMovie({
      tmdbId: target.tmdbId,
      title: '',
      qualityProfileId: profiles?.[0]?.id || 1,
      rootFolderPath: rootFolders?.[0]?.path || '',
      year: 0,
      monitored: true,
      minimumAvailability: 'announced',
      searchNow: false,
    })
    return releaseInfo ? radarr.pushRelease(releaseInfo) : radarr.downloadRelease(guid, indexerId)
  }

  if (!target.tvdbId) return { error: 'TVDB ID manquant' }
  const sonarr = await getSonarrServiceForUser()
  if (!sonarr) return { error: 'Sonarr non configuré' }

  if (typeof target.seasonNumber === 'number' && typeof target.episodeNumber === 'number') {
    await sonarr.monitorEpisode(target.tvdbId, target.seasonNumber, target.episodeNumber)
  } else if (typeof target.seasonNumber === 'number') {
    await sonarr.monitorSeason(target.tvdbId, target.seasonNumber)
  }
  return releaseInfo ? sonarr.pushRelease(releaseInfo) : sonarr.downloadRelease(guid, indexerId)
}

/** L'identifiant TVDB d'une serie, que Sonarr et Prowlarr attendent a la place du TMDB. */
export async function tvdbIdOf(tmdbId: number): Promise<number | null> {
  const tmdb = await getTmdbServiceForUser()
  if (!tmdb) return null
  return (await tmdb.getExternalIds('tv', tmdbId).catch(() => null))?.tvdb_id ?? null
}

// --- le gestionnaire choisi -------------------------------------------------

/** sorraa quand l'admin l'a choisi pour ce type de media, qu'il soit joignable ou non : comme pour les demandes. */
async function sorraaFor(mediaType: MediaKind): Promise<SorraaService | 'not_configured' | null> {
  if ((await getManagerKind(mediaType)) !== 'sorraa') return null
  return (await getSorraaService()) ?? 'not_configured'
}

const SORRAA_NOT_CONFIGURED: ReleaseFailure = { error: 'sorraa n’est pas configuré sur MediaHub.', status: 503 }

/** Les releases de la cible, par le gestionnaire choisi pour ce type de media. */
export async function searchReleases(target: ReleaseTarget): Promise<ReleaseSearchResult> {
  const sorraa = await sorraaFor(target.mediaType)
  if (sorraa === 'not_configured') return SORRAA_NOT_CONFIGURED
  return sorraa ? searchSorraa(sorraa, target) : searchArrReleases(target)
}

/** Ce que l'API du lecteur sait d'une release choisie. */
export interface ChosenRelease {
  /** Le jeton de sorraa, ou le guid de l'indexeur. */
  id: string
  indexerId: number
  /** Radarr/Sonarr ne connaissent pas la release : il leur faut ceci en entier. Inutile pour sorraa. */
  info?: ReleaseInfo
}

/**
 * Envoie la release choisie au telechargement, par le gestionnaire choisi.
 * `target.tvdbId` doit etre renseigne pour une serie avec Radarr/Sonarr.
 */
export async function grabRelease(target: ReleaseTarget, chosen: ChosenRelease): Promise<ReleaseGrabResult> {
  const sorraa = await sorraaFor(target.mediaType)
  if (sorraa === 'not_configured') return SORRAA_NOT_CONFIGURED
  if (sorraa) return grabSorraa(sorraa, chosen.id)
  return grabArrRelease(target, chosen.id, chosen.indexerId, chosen.info)
}

/** Vrai quand le choix passera par sorraa : la route sait alors qu'elle n'a pas besoin de l'adresse de la release. */
export async function usesSorraa(mediaType: MediaKind): Promise<boolean> {
  return (await getManagerKind(mediaType)) === 'sorraa'
}
