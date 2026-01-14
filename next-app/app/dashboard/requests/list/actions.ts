'use server'

import { getCurrentUser, getTmdbServiceForUser, getRadarrServiceForUser, getSonarrServiceForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getMediaAvailability } from '@/lib/services/media-status'

export async function forceSyncRequests() {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false }
        
        const instanceId = parseInt((user as any).instanceId)
        
        // Find all requests for this instance to clear their availability cache
        const requests = await (prisma as any).mediaRequest.findMany({
            where: { instanceId }
        })
        
        const { forget } = await import('@/lib/cache')
        
        for (const req of requests) {
            forget(`media_availability_${req.mediaType}_${req.tmdbId}`)
        }
        
        revalidatePath('/dashboard/requests/list')
        return { 
            success: true, 
            syncedCount: requests.length
        }
    } catch (e) {
        console.error('Failed to force sync requests:', e)
        return { success: false }
    }
}

export async function fetchUserRequests(page: number, pageSize: number = 20) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.email) return { results: [], total: 0, totalPages: 0 }

    const instanceId = parseInt((user as any).instanceId)
    const dbUser = await (prisma as any).user.findFirst({
      where: { email: user.email, instanceId }
    })
    
    if (!dbUser) return { results: [], total: 0, totalPages: 0 }

    const tmdbService = await getTmdbServiceForUser()
    const skip = (page - 1) * pageSize
    
    // Tout le monde voit toutes les demandes de son instance
    const whereClause = { instanceId }
    
    console.log(`[FetchRequests] User role: ${dbUser.role}, fetching all requests for instance ${instanceId}`)
    
    // Read from local DB instead of Jellyseerr API
    const [requests, total] = await Promise.all([
        (prisma as any).mediaRequest.findMany({
            where: whereClause,
            orderBy: { requestedAt: 'desc' },
            skip,
            take: pageSize
        }),
        (prisma as any).mediaRequest.count({
            where: whereClause
        })
    ])

    // Map DB format to the format expected by the UI
    const enrichedRequests = await Promise.all(requests.map(async (req: any) => {
        let metadata: any = {}
        try {
            metadata = req.metadata ? JSON.parse(req.metadata) : {}
        } catch (e) {}

        let status = req.status;

        // Check availability and enrich metadata if poster is missing
        try {
            const tmdbIdNum = parseInt(req.tmdbId);
            if (isNaN(tmdbIdNum)) {
                console.error(`[FetchRequests] Invalid TMDB ID for request ${req.id}: ${req.tmdbId}`);
                return {
                    id: req.id,
                    externalId: req.externalId,
                    type: req.mediaType,
                    status: req.status,
                    createdAt: req.requestedAt,
                    isOnEmby: req.isOnEmby,
                    embyItemId: req.embyItemId,
                    media: {
                        tmdbId: req.tmdbId,
                        title: req.title,
                        ...metadata
                    },
                    requestedBy: {
                        displayName: req.requesterName,
                        email: req.requesterEmail
                    }
                }
            }

            const availability = await getMediaAvailability(tmdbIdNum, req.mediaType as 'movie' | 'tv');
            
            // Map MediaStatus to numeric status
            // 1=PENDING, 2=APPROVED/PROCESSING, 3=PROCESSING, 4=PARTIAL, 5=AVAILABLE
            if (availability.status === 'available') {
                status = 5;
            } else if (availability.status === 'partial') {
                status = 4;
            } else if (availability.status === 'pending' || availability.status === 'processing') {
                status = 3;
            } else if (availability.status === 'unknown') {
                status = 1;
            }

            // Enrich metadata with poster if missing or broken
            const isBrokenPoster = !metadata.posterPath || 
                                 metadata.posterPath === "" || 
                                 metadata.posterPath === "null" ||
                                 metadata.posterPath === "undefined" ||
                                 metadata.posterPath.startsWith('/api/v3/mediacover') ||
                                 metadata.posterPath.startsWith('/api/mediacover');

            if (isBrokenPoster) {
                console.log(`[FetchRequests] Fixing broken poster for ${req.title} (ID: ${req.id}, TMDB: ${req.tmdbId})`);
                
                // Prioritize TMDB directly as it's more reliable for the frontend
                if (tmdbService) {
                    try {
                        const poster = await tmdbService.getPosterPath(tmdbIdNum, req.mediaType as 'movie' | 'tv');
                        if (poster) {
                            console.log(`[FetchRequests] Found TMDB poster for ${req.title}: ${poster}`);
                            metadata.posterPath = poster;
                        } else {
                            console.warn(`[FetchRequests] No TMDB poster found for ${req.title} (${req.tmdbId})`);
                        }
                    } catch (tmdbError) {
                        console.error(`[FetchRequests] TMDB error for ${req.title}:`, tmdbError);
                    }
                }

                // Fallback to Sonarr/Radarr ONLY if it's a remote URL and we still don't have a poster
                if ((!metadata.posterPath || metadata.posterPath.startsWith('/api')) && availability.details) {
                    const details = availability.details as any;
                    const remotePoster = details.remotePoster;
                    if (remotePoster && remotePoster.startsWith('http')) {
                        metadata.posterPath = remotePoster;
                        console.log(`[FetchRequests] Found remote poster from service for ${req.title}: ${remotePoster}`);
                    }
                }

                if (metadata.posterPath && !metadata.posterPath.startsWith('/api')) {
                    // Update DB with enriched metadata
                    try {
                        await (prisma as any).mediaRequest.update({
                            where: { id: req.id },
                            data: { metadata: JSON.stringify(metadata) }
                        });
                        console.log(`[FetchRequests] Updated DB metadata for ${req.title}`);
                    } catch (dbError) {
                        console.error(`[FetchRequests] Failed to update DB metadata for ${req.id}:`, dbError);
                    }
                }
            }

            // Update DB if status changed
            if (status !== req.status) {
                (prisma as any).mediaRequest.update({
                    where: { id: req.id },
                    data: { status: status }
                }).catch((e: any) => console.error('Failed to update status', e));
            }
        } catch (e) {
            console.error(`Error checking availability for request ${req.id}:`, e);
        }

        return {
            id: req.id,
            externalId: req.externalId,
            type: req.mediaType,
            status: status,
            createdAt: req.requestedAt,
            isOnEmby: req.isOnEmby,
            embyItemId: req.embyItemId,
            media: {
                tmdbId: req.tmdbId,
                title: req.title,
                ...metadata
            },
            requestedBy: {
                displayName: req.requesterName,
                email: req.requesterEmail
            }
        }
    }));

    return {
        results: enrichedRequests,
        total: total,
        totalPages: Math.ceil(total / pageSize)
    }
  } catch (error) {
    console.error('Error fetching user requests:', error)
    return { results: [], total: 0, totalPages: 0 }
  }
}
