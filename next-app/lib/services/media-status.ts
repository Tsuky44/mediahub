import { getRadarrServiceForUser, getSonarrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { SonarrSeries, SonarrSeason } from '@/lib/services/sonarr'
import { remember, forget, cache } from '@/lib/cache'

export type MediaStatus = 'unknown' | 'available' | 'partial' | 'pending' | 'processing'

export interface MediaAvailability {
    status: MediaStatus;
    available: boolean;
    seasons?: { seasonNumber: number; status: MediaStatus; available: boolean; totalEpisodes?: number }[];
    details?: any;
}

export async function getMediaAvailability(tmdbId: number, mediaType: 'movie' | 'tv', forceRefresh = false): Promise<MediaAvailability> {
    const cacheKey = `media_availability_${mediaType}_${tmdbId}`
    
    const fetchFreshData = async (): Promise<MediaAvailability> => {
        try {
            if (mediaType === 'movie') {
                const radarrService = await getRadarrServiceForUser()
                if (!radarrService) return { status: 'unknown' as MediaStatus, available: false }

                const movie = await radarrService.getMovieByTmdbId(tmdbId)
                
                // If movie has no ID, it's not in the library
                if (!movie || !movie.id) return { status: 'unknown' as MediaStatus, available: false }

                if (movie.hasFile) {
                    return { status: 'available' as MediaStatus, available: true, details: movie }
                } else if (movie.monitored) {
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
                        status = 'pending';
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
                } else if (anyPending || series.monitored) {
                    overallStatus = 'pending';
                } else {
                    // No files, no monitored seasons -> Unknown (or just not requested)
                    overallStatus = 'unknown';
                }

                // If we have seasons but none are requested/available, it stays unknown
                if (allSeasons.length > 0 && allSeasons.every(s => s.status === 'unknown')) {
                    overallStatus = 'unknown';
                }

                return {
                    status: overallStatus,
                    available: overallStatus === 'available' || overallStatus === 'partial',
                    seasons,
                    details: series
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
        cache.set(cacheKey, freshData, { ttl: 60 * 1000 })
        return freshData
    }
    
    return remember(cacheKey, 60 * 1000, fetchFreshData)
}
