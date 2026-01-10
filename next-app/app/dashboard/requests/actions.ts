'use server'

import { getJellyseerrServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { getWatchLaterList, isInWatchLater, areInWatchLater } from '../media/watch-later-actions'
  import { fetchUserRecommendations, fetchServerTrends } from '../media/actions'
  
  export async function fetchMedia(page: number, type: 'all' | 'movie' | 'tv' | 'watch-later' | 'recommendations' | 'trends', search?: string, filters?: any) {
    try {
      const tmdbService = await getTmdbServiceForUser()
      if (!tmdbService) {
          return { results: [], total_pages: 0 }
      }
      
      const jellyseerrService = await getJellyseerrServiceForUser()
      
      if (type === 'recommendations') {
          return await fetchUserRecommendations(page)
      }
      if (type === 'trends') {
          return await fetchServerTrends(page)
      }
      let data;
    if (type === 'watch-later') {
        const watchLaterItems = await getWatchLaterList()
        // Format for MediaCard
        const results = await Promise.all(watchLaterItems.map(async (item) => {
            const availability = jellyseerrService 
              ? await jellyseerrService.getMediaAvailability(parseInt(item.tmdbId || item.mediaId), item.mediaType as 'movie' | 'tv')
              : { available: false, status: 'unknown' }
            return {
                id: item.mediaId,
                tmdbId: item.tmdbId,
                title: item.title,
                poster_path: item.posterPath,
                media_type: item.mediaType,
                media_status: availability,
                isWatchLater: true
            }
        }))
        return { results, total_pages: 1, total_results: results.length }
    }


    if (search) {
      if (type === 'movie' || type === 'tv') {
        data = await tmdbService.search(type, search, page)
      } else {
        data = await tmdbService.searchMulti(search, page)
      }
    } else if (filters && Object.keys(filters).length > 0) {
        if (type === 'all') {
            data = await tmdbService.discoverMixed({ ...filters, page })
        } else {
            data = await tmdbService.discover(type, { ...filters, page })
        }
    } else {
      data = await tmdbService.getTrending(type, page)
    }

    // Enrich with Jellyseerr status
    if (data.results && data.results.length > 0) {
        // Pre-check watch later in batch
        const itemsToCheck = data.results
            .map((item: any) => ({
                id: item.id.toString(),
                mediaType: item.media_type || (type === 'all' ? undefined : type)
            }))
            .filter((i: any) => i.mediaType === 'movie' || i.mediaType === 'tv')

        const watchLaterStatuses = await areInWatchLater(itemsToCheck)
        const watchLaterSet = new Set(watchLaterStatuses)

        const enrichedResults = await Promise.all(data.results.map(async (item: any) => {
            const mediaType = item.media_type || (type === 'all' ? undefined : type)
            if (!mediaType || (mediaType !== 'movie' && mediaType !== 'tv')) {
                return item
            }
            
            try {
                // Jellyseerr availability check (cached)
                const availability = jellyseerrService 
                    ? await jellyseerrService.getMediaAvailability(item.id, mediaType)
                    : { available: false, status: 'unknown' }
                const isWatchLater = watchLaterSet.has(`${mediaType}:${item.id}`)
                return { ...item, media_status: availability, isWatchLater }
            } catch (e) {
                return item
            }
        }))
        return { ...data, results: enrichedResults }
    }

    return data
  } catch (error) {
    console.error('Error fetching media:', error)
    return { results: [], total_pages: 0 }
  }
}

export async function getFilterOptions(type: 'all' | 'movie' | 'tv') {
    try {
        const tmdbService = await getTmdbServiceForUser()
        if (!tmdbService) return { genres: [] }

        if (type === 'all') {
            // Fetch both and merge
            const [movieGenres, tvGenres] = await Promise.all([
                tmdbService.getGenres('movie'),
                tmdbService.getGenres('tv')
            ])
            
            // Merge genres by ID (some share ID and name, some distinct)
            // Actually, IDs are unique to the list? 
            // Action is 28 in movie, 10759 (Action & Adventure) in TV.
            // If we want to filter "Action", we need to know which one.
            // For simplicity in "Mixed" mode, we'll just show all genres combined, 
            // and if selected, we might need to handle mapping in discoverMixed?
            // Or just pass the ID and hope discover ignores invalid IDs for the type?
            // TMDB ignores invalid genre IDs usually.
            
            const genreMap = new Map()
            movieGenres.forEach((g: any) => genreMap.set(g.id, g))
            tvGenres.forEach((g: any) => genreMap.set(g.id, g))
            
            return { genres: Array.from(genreMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name)) }
        }
        const genres = await tmdbService.getGenres(type)
        return { genres }
    } catch (e) {
        return { genres: [] }
    }
}

export async function getWatchProviders(type: 'all' | 'movie' | 'tv', region: string) {
    try {
        const tmdbService = await getTmdbServiceForUser()
        if (!tmdbService) return []

        if (type === 'all') {
            const [movieProviders, tvProviders] = await Promise.all([
                tmdbService.getWatchProviders('movie', region),
                tmdbService.getWatchProviders('tv', region)
            ])
            
            const providerMap = new Map()
            movieProviders.forEach((p: any) => providerMap.set(p.provider_id, p))
            tvProviders.forEach((p: any) => providerMap.set(p.provider_id, p))
            
            return Array.from(providerMap.values()).sort((a: any, b: any) => a.provider_name.localeCompare(b.provider_name))
        }
        return await tmdbService.getWatchProviders(type, region)
    } catch (e) {
        return []
    }
}
