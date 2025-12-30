import { prisma } from '@/lib/prisma'
import { jellyseerrService } from './jellyseerr'
import { tmdbService } from './tmdb'
import { embyService } from './emby'

export async function syncJellyseerrRequests() {
    console.log('[Sync] Starting Jellyseerr requests sync...')
    try {
        // 1. Fetch all requests from Jellyseerr with pagination
        let jellyRequests: any[] = []
        let skip = 0
        const take = 100
        let hasMore = true

        while (hasMore) {
            const data = await jellyseerrService.getRequests(take, skip)
            const results = data.results || []
            jellyRequests = [...jellyRequests, ...results]
            
            if (results.length < take) {
                hasMore = false
            } else {
                skip += take
            }
        }
        
        console.log(`[Sync] Found ${jellyRequests.length} requests in Jellyseerr`)

        // 2. Fetch all users for mapping
        const [users, jellyUsers] = await Promise.all([
            prisma.user.findMany({
                select: { id: true, email: true, name: true, embyUserId: true, jellyseerrUserId: true }
            }),
            jellyseerrService.getUsers()
        ])
        console.log(`[Sync] Mapping with ${users.length} local users and ${jellyUsers.length} Jellyseerr users`)

        // 3. Pre-fetch Emby items to optimize checks
        const embyItemsMap = new Map<string, any>()
        const checkUser = users.find(u => u.embyUserId) // Use first user with Emby ID
        
        if (checkUser?.embyUserId) {
            try {
                console.log('[Sync] Fetching Emby library for availability check...')
                const [movies, series] = await Promise.all([
                    embyService.getUserItems(checkUser.embyUserId, {
                        IncludeItemTypes: 'Movie',
                        Recursive: true,
                        Fields: 'ProviderIds',
                        Limit: 10000
                    }),
                    embyService.getUserItems(checkUser.embyUserId, {
                        IncludeItemTypes: 'Series',
                        Recursive: true,
                        Fields: 'ProviderIds',
                        Limit: 10000
                    })
                ])

                const allItems = [...(movies.Items || []), ...(series.Items || [])]
                allItems.forEach((item: any) => {
                    if (item.ProviderIds?.Tmdb) {
                        embyItemsMap.set(item.ProviderIds.Tmdb.toString(), item)
                    }
                })
                console.log(`[Sync] Built Emby cache with ${embyItemsMap.size} items`)
            } catch (e) {
                console.error('[Sync] Failed to pre-fetch Emby items:', e)
            }
        }

        // 4. Process each request
        for (const jr of jellyRequests) {
            try {
                const externalId = jr.id.toString()
                const tmdbId = (jr.media?.tmdbId || jr.tmdbId)?.toString()
                const mediaType = jr.type || jr.media?.mediaType

                if (!tmdbId) {
                    console.warn(`[Sync] Skipping request ${jr.id} - missing tmdbId`, jr)
                    continue
                }

                // Find corresponding local user
                const requesterEmail = jr.requestedBy?.email
                const requesterName = jr.requestedBy?.displayName || jr.requestedBy?.email?.split('@')[0]
                const jellyUserId = jr.requestedBy?.id?.toString()
                
                let localUser = users.find(u => 
                    (jellyUserId && u.jellyseerrUserId === jellyUserId) ||
                    (requesterEmail && u.email?.toLowerCase() === requesterEmail.toLowerCase()) ||
                    (requesterName && u.name?.toLowerCase() === requesterName.toLowerCase())
                )

                // Try to find by Emby ID if possible (Jellyseerr user might have it)
                if (!localUser && jellyUserId) {
                    const ju = jellyUsers.find((u: any) => u.id.toString() === jellyUserId)
                    if (ju && ju.embyId) {
                        localUser = users.find(u => u.embyUserId === ju.embyId)
                    }
                }
                
                if (!localUser) {
                    // console.log(`[Sync] Local user not found for request ${jr.id}. Storing without user link.`)
                }

                // Check availability on Emby
                let isOnEmby = false
                let embyItemId = null
                
                // Use cached Emby items
                if (embyItemsMap.has(tmdbId)) {
                    const embyItem = embyItemsMap.get(tmdbId)
                    isOnEmby = true
                    embyItemId = embyItem.Id
                } else if (jr.media.status === 5) {
                    // Fallback: If Jellyseerr says it's available, it is likely on Emby/Plex
                    // We trust Jellyseerr status if we couldn't find it by TMDB ID (maybe ID mismatch)
                    isOnEmby = true
                    // We can't easily guess Emby ID without lookup, but at least we show it as available
                }

                // Get TMDB metadata if not present
                let metadata = jr.media.metadata || null
                let title = jr.media.title || jr.media.name
                
                if (!title) {
                    const details = await tmdbService.getDetails(parseInt(tmdbId), mediaType)
                    if (details) {
                        title = details.title || details.name
                        metadata = JSON.stringify({
                            posterPath: details.poster_path,
                            backdropPath: details.backdrop_path,
                            overview: details.overview
                        })
                    }
                } else if (!metadata) {
                     metadata = JSON.stringify({
                        posterPath: jr.media.posterPath,
                        backdropPath: jr.media.backdropPath,
                    })
                }

                // Find existing request
                const existingRequest = await (prisma as any).mediaRequest.findUnique({
                    where: { externalId: externalId }
                })

                const requestData = {
                    status: jr.media.status,
                    isOnEmby,
                    embyItemId,
                    metadata,
                    updatedAt: new Date(),
                    // Update user link if found
                    userId: localUser ? localUser.id : null
                }

                if (existingRequest) {
                    // Update
                    await (prisma as any).mediaRequest.update({
                        where: { id: existingRequest.id },
                        data: requestData
                    })
                } else {
                    // Create
                    await (prisma as any).mediaRequest.create({
                        data: {
                            ...requestData,
                            externalId: externalId,
                            tmdbId: tmdbId,
                            mediaType: mediaType,
                            title: title || 'Sans titre',
                            requesterName: jr.requestedBy?.displayName || jr.requestedBy?.email?.split('@')[0],
                            requesterEmail: jr.requestedBy?.email,
                            requestedAt: new Date(jr.createdAt),
                        }
                    })
                }

                // If just became available, check if we need to notify (reusing logic from notification-sync if needed)
                // Actually, let's keep it separate for now to avoid duplication.
            } catch (err) {
                console.error(`[Sync] Error processing request ${jr.id}:`, err)
            }
        }

        console.log('[Sync] Jellyseerr requests sync finished')
        return { success: true, count: jellyRequests.length }
    } catch (error) {
        console.error('[Sync] Critical error during Jellyseerr sync:', error)
        return { success: false, error }
    }
}
