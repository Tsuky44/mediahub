'use server'

import { embyService } from '@/lib/services/emby'
import { tmdbService } from '@/lib/services/tmdb'
import { getWatchLaterList, isInWatchLater } from './watch-later-actions'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function fetchEmbyMedia(page: number, type: 'movie' | 'tv' | 'all', query?: string, favoritesOnly: boolean = false, watchLaterOnly: boolean = false) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return { results: [], total_pages: 0 }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
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
            
            if (tmdbId) {
                poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), itemType)
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

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
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
                const seriesTmdbId = series.ProviderIds?.Tmdb
                if (seriesTmdbId) {
                    poster_path = await tmdbService.getPosterPath(parseInt(seriesTmdbId), 'tv')
                    tmdbId = seriesTmdbId
                }
            } else if (tmdbId) {
                poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), itemType)
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

export async function toggleFavorite(itemId: string, isFavorite: boolean) {
    try {
        const user = await getCurrentUser()
        if (!user || !user.email) return false

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!dbUser || !dbUser.embyUserId) return false
        
        const userId = dbUser.embyUserId
        await embyService.updateFavoriteStatus(userId, itemId, isFavorite)
        return true
    } catch (e) {
        console.error('Failed to toggle favorite', e)
        return false
    }
}
