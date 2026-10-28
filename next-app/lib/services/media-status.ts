import { getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { SonarrSeries, SonarrSeason } from '@/lib/services/sonarr'
import { remember, forget, cache } from '@/lib/cache'

/**
 * `unreleased` : demandé (Radarr/Sonarr surveillent le média) mais pas encore sorti,
 * rien ne peut être téléchargé pour l'instant. Affichage seulement : la demande
 * suit exactement le même chemin que les autres.
 */
export type MediaStatus = 'unknown' | 'available' | 'partial' | 'pending' | 'processing' | 'unreleased'

export interface MediaAvailability {
    status: MediaStatus;
    available: boolean;
    seasons?: { seasonNumber: number; status: MediaStatus; available: boolean; totalEpisodes?: number }[];
    details?: any;
    /** Date de sortie attendue (ISO), quand le statut est `unreleased` et qu'elle est connue */
    releaseDate?: string;
}

/** Champs de date renvoyés par l'API Radarr (film) et Sonarr (série, saison). */
interface RadarrReleaseInfo { status?: string; inCinemas?: string; digitalRelease?: string; physicalRelease?: string }
interface SonarrAiringInfo { episodeCount?: number; previousAiring?: string; nextAiring?: string; firstAired?: string }

const isPast = (iso?: string | null) => !!iso && new Date(iso).getTime() <= Date.now()
const isFuture = (iso?: string | null) => !!iso && new Date(iso).getTime() > Date.now()
const earliest = (dates: (string | null | undefined)[]) =>
    dates.filter((d): d is string => isFuture(d)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]

/**
 * Film surveillé sans fichier : sorti en vidéo (numérique ou physique) ou pas encore ?
 * Les demandes ajoutent les films avec la disponibilité minimale « announced », donc
 * `isAvailable` de Radarr est presque toujours vrai : on regarde les dates de sortie.
 */
function movieReleaseState(movie: RadarrReleaseInfo): { unreleased: boolean; releaseDate?: string } {
    const homeReleases = [movie.digitalRelease, movie.physicalRelease]
    if (homeReleases.some(isPast)) return { unreleased: false }
    const next = earliest(homeReleases)
    if (next) return { unreleased: true, releaseDate: next }
    // Aucune date de sortie vidéo connue : statut Radarr (tba, announced, inCinemas, released)
    if (['tba', 'announced', 'inCinemas'].includes(movie.status ?? '')) {
        return { unreleased: true, releaseDate: earliest([movie.inCinemas]) }
    }
    return { unreleased: false }
}

/** Saison surveillée dont aucun épisode n'est encore diffusé (statistiques Sonarr). */
function seasonNotAiredYet(stats?: SonarrAiringInfo): boolean {
    return !!stats && !stats.previousAiring && (stats.episodeCount ?? 0) === 0
}

export async function getMediaAvailability(tmdbId: number, mediaType: 'movie' | 'tv', forceRefresh = false): Promise<MediaAvailability> {
    const cacheKey = `media_availability_${mediaType}_${tmdbId}`
    
    const fetchFreshData = async (): Promise<MediaAvailability> => {
        try {
            if (mediaType === 'movie') {
                const radarrService = await getRadarrServiceForUser()
                if (!radarrService) return { status: 'unknown' as MediaStatus, available: false }

                // Lecture locale de la bibliothèque Radarr (rapide) ; lookup complet seulement si Radarr ne répond pas
                const movie = await radarrService.getLibraryMovieByTmdbId(tmdbId)
                    .catch(() => radarrService.getMovieByTmdbId(tmdbId))
                
                // If movie has no ID, it's not in the library
                if (!movie || !movie.id) return { status: 'unknown' as MediaStatus, available: false }

                if (movie.hasFile) {
                    return { status: 'available' as MediaStatus, available: true, details: movie }
                } else if (movie.monitored) {
                    const release = movieReleaseState(movie as unknown as RadarrReleaseInfo)
                    if (release.unreleased) {
                        return { status: 'unreleased' as MediaStatus, available: false, details: movie, releaseDate: release.releaseDate }
                    }
                    return { status: 'pending' as MediaStatus, available: false, details: movie }
                }
                
                return { status: 'unknown' as MediaStatus, available: false, details: movie }

            } else if (mediaType === 'tv') {
                const sonarrService = await getSonarrServiceForUser()
                const tmdbService = await getTmdbServiceForUser()
                if (!sonarrService || !tmdbService) return { status: 'unknown' as MediaStatus, available: false }

                // Need TVDB ID
                const externalIds = await tmdbService.getExternalIds('tv', tmdbId)
                if (!externalIds || !externalIds.tvdb_id) return { status: 'unknown' as MediaStatus, available: false }

                const series = await sonarrService.getSeriesByTvdbId(externalIds.tvdb_id)
                
                // If series has no ID, it's not in the library
                if (!series || !series.id) return { status: 'unknown' as MediaStatus, available: false }

                // Check seasons
                const seasons = (series as unknown as SonarrSeries).seasons.map((s: SonarrSeason) => {
                    const totalEpisodes = s.statistics?.totalEpisodeCount || 0;
                    const fileCount = s.statistics?.episodeFileCount || 0;
                    
                    const hasFiles = fileCount > 0;
                    // A season is complete only if it has episodes and all are present
                    const isComplete = totalEpisodes > 0 && fileCount >= totalEpisodes;
                    
                    // A season is monitored if the season itself is monitored AND it's not a dummy season
                    // Sonarr sometimes returns monitored: true for seasons that aren't actually active
                    const isMonitored = s.monitored;
                    
                    let status: MediaStatus = 'unknown';
                    if (isComplete) {
                        status = 'available';
                    } else if (hasFiles) {
                        status = 'partial';
                    } else if (isMonitored) {
                        status = seasonNotAiredYet(s.statistics) ? 'unreleased' : 'pending';
                    }
                    
                    return {
                        seasonNumber: s.seasonNumber,
                        status,
                        available: hasFiles,
                        totalEpisodes
                    }
                });

                // Overall status
                let overallStatus: MediaStatus = 'unknown';
                const allSeasons = seasons.filter(s => s.seasonNumber > 0); // Ignore specials for overall logic
                
                // Filter out seasons that are not monitored and have no files (irrelevant)
                const relevantSeasons = allSeasons.filter(s => s.status !== 'unknown');
                
                const anyAvailable = relevantSeasons.some(s => s.available);
                const anyPending = relevantSeasons.some(s => s.status === 'pending');
                const anyPartial = relevantSeasons.some(s => s.status === 'partial');
                
                // Strict availability: All valid seasons (with episodes) must be 'available'
                // This includes unmonitored seasons if they exist in Sonarr but are missing locally
                const validSeasons = allSeasons.filter(s => (s.totalEpisodes || 0) > 0);
                const allAvailable = validSeasons.length > 0 && validSeasons.every(s => s.status === 'available');
                
                // If the user hasn't requested anything (no monitored seasons) and no files exist, it should be unknown
                // Unless the series itself is monitored (pending)
                const hasAnyFiles = validSeasons.some(s => s.available);


                if (allAvailable) {
                    overallStatus = 'available';
                } else if (hasAnyFiles) {
                    // Only mark as partial if we actually have SOME files
                    overallStatus = 'partial';
                } else if (anyPending) {
                    overallStatus = 'pending';
                } else if (relevantSeasons.some(s => s.status === 'unreleased') || (series.monitored && series.status === 'upcoming')) {
                    // Tout ce qui est demandé attend sa première diffusion
                    overallStatus = 'unreleased';
                } else if (series.monitored) {
                    overallStatus = 'pending';
                } else {
                    // No files, no monitored seasons -> Unknown (or just not requested)
                    overallStatus = 'unknown';
                }

                // If we have seasons but none are requested/available, it stays unknown
                if (allSeasons.length > 0 && allSeasons.every(s => s.status === 'unknown')) {
                    overallStatus = 'unknown';
                }

                const seriesStats = series as unknown as SonarrAiringInfo
                const releaseDate = overallStatus === 'unreleased'
                    ? earliest([
                        ...(series as unknown as SonarrSeries).seasons
                            .filter((s: SonarrSeason) => s.monitored && s.seasonNumber > 0)
                            .map((s: SonarrSeason) => (s.statistics as SonarrAiringInfo | undefined)?.nextAiring),
                        seriesStats.nextAiring,
                        seriesStats.firstAired,
                    ])
                    : undefined

                return {
                    status: overallStatus,
                    available: overallStatus === 'available' || overallStatus === 'partial',
                    seasons,
                    details: series,
                    releaseDate,
                }
            }

            return { status: 'unknown' as MediaStatus, available: false }
        } catch (e) {
            console.error(`[MediaStatus] Error checking availability for ${mediaType}/${tmdbId}:`, e)
            return { status: 'unknown' as MediaStatus, available: false }
        }
    }

    if (forceRefresh) {
        forget(cacheKey)
        const freshData = await fetchFreshData()
        // Mettre à jour le cache avec les nouvelles données
        cache.set(cacheKey, freshData, 60 * 1000)
        return freshData
    }
    
    return remember(cacheKey, 60 * 1000, fetchFreshData)
}

/**
 * Listes de demandes : le média demandé attend-il sa sortie ? Réponse en 1,5 s au
 * plus (sinon « non », la liste ne doit pas attendre Radarr/Sonarr) ; cache 60 s.
 */
export async function getReleaseWait(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<{ awaitingRelease: boolean; releaseDate?: string }> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500) })
    try {
        const availability = await Promise.race([getMediaAvailability(tmdbId, mediaType), timeout])
        if (availability?.status === 'unreleased') {
            return { awaitingRelease: true, releaseDate: availability.releaseDate }
        }
    } catch {
        // statut inconnu : affichage habituel
    } finally {
        clearTimeout(timer)
    }
    return { awaitingRelease: false }
}

/**
 * API du lecteur (contrat figé) : « unreleased » n'y existe pas, il reste « pending ».
 * L'information est fournie à part (champ `awaitingRelease`).
 */
export function toPlayerStatus(status: MediaStatus): Exclude<MediaStatus, 'unreleased'> {
    return status === 'unreleased' ? 'pending' : status
}
