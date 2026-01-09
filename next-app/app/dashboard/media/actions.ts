'use server'

import { getWatchLaterList, isInWatchLater } from './watch-later-actions'
import { getCurrentUser, getEmbyServiceForUser, getTmdbServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function fetchEmbyMedia(page: number, type: 'movie' | 'tv' | 'all', query?: string, favoritesOnly: boolean = false, watchLaterOnly: boolean = false) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const instanceId = parseInt((user as any).instanceId)
        const embyService = await getEmbyServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!embyService) return { results: [], total_pages: 0 }

        const dbUser = await (prisma as any).user.findFirst({
            where: { 
                email: user.email,
                instanceId
            }
        })
        
        if (!dbUser || !dbUser.embyUserId) return { results: [], total_pages: 0 }
        
        const userId = dbUser.embyUserId
        const limit = 50
        const startIndex = (page - 1) * limit

        const includeItemTypes = type === 'all' ? 'Movie,Series' : (type === 'movie' ? 'Movie' : 'Series')

        let ids: string | undefined = undefined
        if (watchLaterOnly) {
            const watchLaterItems = await getWatchLaterList()
            const embyWatchLaterIds = watchLaterItems
                .filter(i => i.isEmbyItem && (type === 'all' || i.mediaType === type))
                .map(i => i.mediaId)
            
            if (embyWatchLaterIds.length === 0) return { results: [], total_pages: 0 }
            ids = embyWatchLaterIds.join(',')
        }

        const data = await embyService.getUserItems(userId, {
            SearchTerm: query,
            StartIndex: startIndex,
            Limit: limit,
            Recursive: true,
            IncludeItemTypes: includeItemTypes,
            Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds,UserData',
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IsFavorite: favoritesOnly ? true : undefined,
            Ids: ids
        })

        const items = data.Items || []
        
        // Fetch TMDB poster paths in parallel for the current page
        const enrichedItems = await Promise.all(items.map(async (item: any) => {
            const tmdbId = item.ProviderIds?.Tmdb
            const itemType = item.Type === 'Movie' ? 'movie' : 'tv'
            let poster_path = null
            
            if (tmdbId && tmdbService) {
                poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), itemType)
            }

            // Fallback to Emby image if TMDB image is not available
            if (!poster_path) {
                poster_path = embyService.getItemImageUrl(item.Id)
            }

            const isWatchLaterItem = await isInWatchLater(item.Id, itemType)

            return {
                id: item.Id,
                title: item.Name,
                name: item.Name,
                poster_path: poster_path,
                media_type: itemType,
                overview: item.Overview,
                emby_id: item.Id,
                tmdbId: tmdbId,
                isFavorite: item.UserData?.IsFavorite || false,
                isWatchLater: isWatchLaterItem
            }
        }))

        return {
            results: enrichedItems,
            total_pages: Math.ceil((data.TotalRecordCount || 0) / limit)
        }
    } catch (e) {
        console.error('Failed to fetch Emby media', e)
        return { results: [], total_pages: 0 }
    }
}

export async function fetchRecentlyWatchedItems() {
    try {
        console.log('[fetchRecentlyWatchedItems] Getting current user...')
        const user = await getCurrentUser()
        if (!user || !user.email) return []

        const instanceId = parseInt((user as any).instanceId)
        const embyService = await getEmbyServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!embyService) return []

        const dbUser = await (prisma as any).user.findFirst({
            where: { 
                email: user.email,
                instanceId
            }
        })

        if (!dbUser || !dbUser.embyUserId) {
            console.log('[fetchRecentlyWatchedItems] User not linked to Emby')
            return []
        }
        
        const userId = dbUser.embyUserId
        console.log('[fetchRecentlyWatchedItems] Fetching recently played items for user:', userId)
        // Fetch even more items to ensure we get 4 unique ones even if many episodes of the same series were watched
        const data = await embyService.getRecentlyPlayedItems(userId, 50)
        const allItems = data.Items || []
        
        // Group items by SeriesId (for episodes) or Id (for movies)
        const uniqueItems: any[] = []
        const seenIds = new Set<string>()

        for (const item of allItems) {
            if (uniqueItems.length >= 4) break

            // Use SeriesId for episodes to group by show, otherwise use item Id
            const groupId = item.Type === 'Episode' ? item.SeriesId : item.Id
            
            if (!groupId || seenIds.has(groupId)) continue

            seenIds.add(groupId)
            uniqueItems.push(item)
        }

        console.log('[fetchRecentlyWatchedItems] Found unique items count:', uniqueItems.length)
        
        const enrichedItems = await Promise.all(uniqueItems.map(async (item: any) => {
            let tmdbId = item.ProviderIds?.Tmdb
            const itemType = item.Type === 'Movie' ? 'movie' : (item.Type === 'Series' ? 'tv' : 'tv')
            
            let poster_path = null
            if (item.Type === 'Episode' && item.SeriesId) {
                const series = await embyService.getItemDetails(item.SeriesId, userId)
                const seriesTmdbId = series?.ProviderIds?.Tmdb
                if (seriesTmdbId && tmdbService) {
                    poster_path = await tmdbService.getPosterPath(parseInt(seriesTmdbId), 'tv')
                    tmdbId = seriesTmdbId
                }
            } else if (tmdbId && tmdbService) {
                poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), itemType)
            }

            // Fallback to Emby image
            if (!poster_path) {
                poster_path = embyService.getItemImageUrl(item.Type === 'Episode' ? item.SeriesId : item.Id)
            }

            const lastPlayedDate = item.UserData?.LastPlayedDate 
                ? new Date(item.UserData.LastPlayedDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : null

            return {
                id: item.Id,
                title: item.Name,
                name: item.Name,
                seriesName: item.SeriesName,
                poster_path: poster_path,
                media_type: item.Type.toLowerCase(),
                type: item.Type,
                overview: item.Overview,
                emby_id: item.Id,
                tmdbId: tmdbId,
                isFavorite: item.UserData?.IsFavorite || false,
                lastPlayedDate: lastPlayedDate,
                parentIndexNumber: item.ParentIndexNumber,
                indexNumber: item.IndexNumber
            }
        }))

        return enrichedItems
    } catch (e) {
        console.error('[fetchRecentlyWatchedItems] Failed to fetch items', e)
        return []
    }
}

export async function fetchUserRecommendations(page: number = 1) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const instanceId = parseInt((user as any).instanceId)
        const embyService = await getEmbyServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!tmdbService) return { results: [], total_pages: 0 }

        const dbUser = await (prisma as any).user.findFirst({
            where: { 
                email: user.email,
                instanceId
            }
        })

        if (!dbUser) return { results: [], total_pages: 0 }

        // 1. Get user's recent watch history from Emby
        let history: any[] = []
        if (dbUser.embyUserId && embyService) {
            const data = await embyService.getRecentlyPlayedItems(dbUser.embyUserId, 15)
            history = data.Items || []
        }

        // 2. Get user's recent requests from local DB
        const requests = await (prisma as any).mediaRequest.findMany({
            where: {
                instanceId,
                OR: [
                    { requesterEmail: user.email },
                    { userId: dbUser.id }
                ]
            },
            orderBy: { requestedAt: 'desc' },
            take: 10
        })

        // Combine history and requests to find seed TMDB IDs
        const seeds: { id: number; type: 'movie' | 'tv' }[] = []
        
        // Process history
        for (const item of history) {
            let tmdbId = item.ProviderIds?.Tmdb
            const type = item.Type === 'Movie' ? 'movie' : (item.Type === 'Series' || item.Type === 'Episode' ? 'tv' : null)
            
            if (item.Type === 'Episode' && item.SeriesId && dbUser.embyUserId && embyService) {
                const series = await embyService.getItemDetails(item.SeriesId, dbUser.embyUserId)
                tmdbId = series?.ProviderIds?.Tmdb
            }

            if (tmdbId && type && !seeds.some(s => s.id === parseInt(tmdbId))) {
                seeds.push({ id: parseInt(tmdbId), type })
            }
            if (seeds.length >= 5) break
        }

        // Process requests if not enough seeds
        if (seeds.length < 10) {
            for (const req of requests) {
                const reqTmdbId = parseInt(req.tmdbId)
                if (req.tmdbId && !seeds.some(s => s.id === reqTmdbId)) {
                    seeds.push({ id: reqTmdbId, type: req.mediaType as 'movie' | 'tv' })
                }
                if (seeds.length >= 10) break
            }
        }

        if (seeds.length === 0) {
            // Fallback to trending if no history/requests
            const trending = await tmdbService.getTrending('movie', page)
            return {
                results: (trending.results || []).map((m: any) => ({
                    ...m,
                    media_type: 'movie',
                    id: m.id.toString(),
                    tmdbId: m.id
                })),
                total_pages: trending.total_pages || 1
            }
        }

        // 3. Get recommendations for each seed in parallel
        // For pagination, we'll fetch from all seeds but offset the results
        const allRecommendations = await Promise.all(
            seeds.map(seed => tmdbService.getRecommendations(seed.id, seed.type, page))
        )

        // 4. Flatten, deduplicate and shuffle
        const combinedResults = allRecommendations.flatMap((res, index) => 
            (res.results || []).map((item: any) => ({
                ...item,
                media_type: seeds[index].type,
                id: item.id.toString(),
                tmdbId: item.id
            }))
        )

        // Deduplicate by TMDB ID
        const uniqueResults = Array.from(new Map(combinedResults.map(item => [`${item.media_type}-${item.id}`, item])).values())
        
        // Find the max total pages among all seed recommendations
        const maxTotalPages = Math.max(...allRecommendations.map(res => res.total_pages || 0))

        return {
            results: uniqueResults.sort(() => 0.5 - Math.random()),
            total_pages: Math.min(maxTotalPages, 10) // Limit to 10 pages for sanity
        }

    } catch (e) {
        console.error('[fetchUserRecommendations] Failed', e)
        return { results: [], total_pages: 0 }
    }
}

export async function fetchServerTrends(page: number = 1) {
    try {
        const user = await getCurrentUser()
        if (!user) return { results: [], total_pages: 0 }

        const instanceId = parseInt((user as any).instanceId)
        const embyService = await getEmbyServiceForUser()
        const tmdbService = await getTmdbServiceForUser()
        
        if (!tmdbService) return { results: [], total_pages: 0 }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // 1. Get most watched items from WatchEvent
        const topWatched = await (prisma as any).watchEvent.groupBy({
            by: ['itemId', 'itemType', 'itemName', 'seriesName'],
            _count: {
                itemId: true
            },
            where: {
                instanceId,
                playedAt: {
                    gte: thirtyDaysAgo
                }
            },
            orderBy: {
                _count: {
                    itemId: 'desc'
                }
            },
            take: 50
        })

        // 2. Get most requested items from MediaRequest
        const topRequested = await (prisma as any).mediaRequest.groupBy({
            by: ['tmdbId', 'mediaType', 'title'],
            _count: {
                tmdbId: true
            },
            where: {
                instanceId,
                requestedAt: {
                    gte: thirtyDaysAgo
                }
            },
            orderBy: {
                _count: {
                    tmdbId: 'desc'
                }
            },
            take: 50
        })

        // 3. Unify and enrich
        const trendItems: any[] = []
        const seenTmdbIds = new Set<string>()

        // Process watched items first
        if (embyService) {
            for (const watch of topWatched) {
                try {
                    const itemDetails = await embyService.getItemDetails(watch.itemId)
                    const tmdbId = itemDetails.ProviderIds?.Tmdb
                    const mediaType = watch.itemType?.toLowerCase() === 'series' || watch.itemType?.toLowerCase() === 'episode' ? 'tv' : 'movie'
                    
                    if (tmdbId) {
                        seenTmdbIds.add(tmdbId)
                        const poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), mediaType)
                        trendItems.push({
                            id: watch.itemId,
                            title: watch.itemName || watch.seriesName,
                            name: watch.itemName || watch.seriesName,
                            poster_path,
                            media_type: mediaType,
                            tmdbId: parseInt(tmdbId),
                            trendingReason: 'Populaire sur le serveur'
                        })
                    }
                } catch (e) {
                    continue
                }
            }
        }

        // Add requested items that aren't already there
        for (const req of topRequested) {
            if (seenTmdbIds.has(req.tmdbId)) continue
            
            try {
                const mediaType = req.mediaType as 'movie' | 'tv'
                const poster_path = await tmdbService.getPosterPath(parseInt(req.tmdbId), mediaType)
                trendItems.push({
                    id: req.tmdbId,
                    title: req.title,
                    name: req.title,
                    poster_path,
                    media_type: mediaType,
                    tmdbId: parseInt(req.tmdbId),
                    trendingReason: 'Fortement demandé'
                })
            } catch (e) {
                continue
            }
        }

        return {
            results: trendItems.sort(() => 0.5 - Math.random()),
            total_pages: 1
        }
    } catch (e) {
        console.error('[fetchServerTrends] Failed', e)
        return { results: [], total_pages: 0 }
    }
}

export async function toggleFavorite(itemId: string, isFavorite: boolean) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return false

        const instanceId = parseInt((user as any).instanceId)
        const embyService = await getEmbyServiceForUser()
        if (!embyService) return false

        const dbUser = await (prisma as any).user.findFirst({
            where: { 
                email: user.email,
                instanceId
            }
        })

        if (!dbUser || !dbUser.embyUserId) return false
        
        const userId = dbUser.embyUserId
        await embyService.updateFavoriteStatus(userId, itemId, isFavorite)
        revalidatePath('/')
        return true
    } catch (e) {
        console.error('Failed to toggle favorite', e)
        return false
    }
}
