'use server'

import { embyService } from '@/lib/services/emby'
import { tmdbService } from '@/lib/services/tmdb'

export async function fetchEmbyMedia(page: number, type: 'movie' | 'tv', query?: string) {
    try {
        const users = await embyService.getUsers()
        if (users.length === 0) return { results: [], total_pages: 0 }
        
        const userId = users[0].Id
        const limit = 50
        const startIndex = (page - 1) * limit

        const data = await embyService.getUserItems(userId, {
            SearchTerm: query,
            StartIndex: startIndex,
            Limit: limit,
            Recursive: true,
            IncludeItemTypes: type === 'movie' ? 'Movie' : 'Series',
            Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds',
            SortBy: 'SortName',
            SortOrder: 'Ascending',
        })

        const items = data.Items || []
        
        // Fetch TMDB poster paths in parallel for the current page
        const enrichedItems = await Promise.all(items.map(async (item: any) => {
            const tmdbId = item.ProviderIds?.Tmdb
            let poster_path = null
            
            if (tmdbId) {
                poster_path = await tmdbService.getPosterPath(parseInt(tmdbId), type === 'movie' ? 'movie' : 'tv')
            }

            return {
                id: item.Id,
                title: item.Name,
                name: item.Name,
                poster_path: poster_path, // Now it's the TMDB hash!
                media_type: type,
                overview: item.Overview,
                emby_id: item.Id,
                tmdbId: tmdbId
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
