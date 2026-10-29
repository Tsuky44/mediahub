import { getDownloadManager } from '@/lib/download-managers'
import { getTmdbService } from '@/lib/services/tmdb'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { defineAbilityFor } from '@/lib/ability'
import { logger } from '@/lib/logger'

export interface CreateMediaRequestBody {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title?: string
  posterPath?: string
  seasons?: number | number[]
}

export interface CreateMediaRequestUser {
  [key: string]: unknown
  id: string
  name: string
  email: string
  role: string
  permissions?: Array<{ action: string; subject: string; conditions?: string | null }>
}

export interface CreateMediaRequestResult {
  status: number
  body: unknown
  /** Identifiants des lignes media_requests creees ou remises a jour. */
  requestIds: number[]
}

/**
 * Cree une demande (Radarr/Sonarr + ligne locale + notification). Partage entre
 * POST /api/request (interface) et l'API d'integration du lecteur.
 */
export async function createMediaRequest(user: CreateMediaRequestUser, body: CreateMediaRequestBody): Promise<CreateMediaRequestResult> {
  const requestIds: number[] = []
  const ability = defineAbilityFor(user)
  if (!ability.can('create', 'MediaRequest')) {
    return { status: 403, body: { error: 'Forbidden: Insufficient permissions' }, requestIds }
  }
  try {
    const { tmdbId, mediaType, title, posterPath } = body

    if (!tmdbId || !mediaType) {
        return { status: 400, body: { error: 'Missing parameters' }, requestIds }
    }

    // Pre-fetch user info and TMDB details for notification
    // (dispatched early to prevent race conditions with Sonarr/Radarr webhooks)
    const dbUser = await (prisma as any).user.findFirst({ where: { id: parseInt(user.id) } })

    let notifOverview: string | undefined
    let notifYear: string | undefined
    let notifGenres: string | undefined
    let notifPosterPath: string | undefined = posterPath

    try {
        const tmdbServiceForNotif = await getTmdbService()
        if (tmdbServiceForNotif) {
            const details = await tmdbServiceForNotif.getDetails(parseInt(String(tmdbId)), mediaType)
            if (details) {
                notifOverview = details.overview || undefined
                notifYear = mediaType === 'movie'
                    ? (details.release_date?.substring(0, 4) || undefined)
                    : (details.first_air_date?.substring(0, 4) || undefined)
                if (details.genres) {
                    notifGenres = details.genres.map((g: { name?: string }) => g.name).join(', ')
                }
                if (!notifPosterPath && details.poster_path) {
                    notifPosterPath = details.poster_path
                }
            }
        }
    } catch (e) {
        logger.warn('[Request API] Failed to pre-fetch TMDB details for notification:', e)
    }

    const manager = await getDownloadManager(mediaType)
    const requestedSeasons = body.seasons === undefined ? undefined : (Array.isArray(body.seasons) ? body.seasons : [body.seasons])
    const outcome = await manager.addRequest({
        tmdbId,
        mediaType,
        title,
        seasons: requestedSeasons,
        requester: { id: user.id, name: user.name || dbUser?.name || '' },
    })
    if (!outcome.ok) {
        return { status: outcome.status, body: { error: outcome.error }, requestIds }
    }
    const result = { success: true, message: outcome.message, data: outcome.data }
    const externalId = outcome.externalId

    if (result.success) {
        // Notify V2 — MEDIA_REQUESTED (dispatched IMMEDIATELY before DB update
        // to prevent race conditions with Sonarr/Radarr webhooks arriving first)
        try {
            const { Notify } = await import('@/lib/notifications-v2')
            const { formatSeasonList } = await import('@/lib/notifications-v2/utils/season-formatter')

            const parsedSeasons: number[] = body.seasons
                ? (Array.isArray(body.seasons) ? body.seasons : [body.seasons])
                : []
            const seasonLabel =
                parsedSeasons.length === 1
                    ? `Saison ${parsedSeasons[0]}`
                    : parsedSeasons.length > 1
                      ? formatSeasonList(parsedSeasons)
                      : undefined
            const displayTitle = seasonLabel ? `${title} — ${seasonLabel}` : (title || 'Sans titre')

            await Notify.mediaRequested(
                {
                    tmdbId: String(tmdbId),
                    mediaType,
                    title: displayTitle,
                    year: notifYear,
                    overview: notifOverview,
                    posterPath: notifPosterPath,
                    genres: notifGenres,
                    seasonNumber: parsedSeasons.length === 1 ? parsedSeasons[0] : undefined,
                },
                dbUser ? {
                    id: dbUser.id,
                    name: dbUser.name ?? undefined,
                    email: dbUser.email ?? undefined,
                    whatsappNumber: dbUser.whatsappNumber ?? undefined,
                } : undefined
            )
        } catch (notifError) {
            logger.error('[Request API] Failed to dispatch Notify V2 MEDIA_REQUESTED:', notifError)
        }

        // Immediate Local DB Update
        try {
            const requestStatus = 2 // PENDING/PROCESSING equivalent
            
            // ALWAYS create a new request instead of merging for TV series
            // Movies can still be merged/updated as they don't have seasons
            let existingRequest = null
            if (mediaType === 'movie') {
                if (externalId) {
                    existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { externalId: externalId }
                    })
                }
                
                if (!existingRequest) {
                     existingRequest = await (prisma as any).mediaRequest.findFirst({
                        where: { tmdbId: tmdbId.toString() }
                     })
                }
            }

            let seasons: number[] = []
            if (mediaType === 'tv') {
                if (body.seasons) {
                    seasons = Array.isArray(body.seasons) ? body.seasons : [body.seasons]
                } else {
                    // Fallback to all seasons if it's a new series request without specific seasons
                    seasons = outcome.allSeasons ?? []
                }
            }

            if (existingRequest && mediaType === 'movie') {
                const updatedRequest = await (prisma as any).mediaRequest.update({
                    where: { id: existingRequest.id },
                    data: {
                        status: requestStatus,
                        updatedAt: new Date(),
                        externalId: externalId || existingRequest.externalId
                    }
                })
                const { logAction } = await import('@/lib/audit')
                requestIds.push(updatedRequest.id)
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', updatedRequest.id, { tmdbId, mediaType, title })
            } else if (mediaType === 'tv' && seasons.length > 0) {
                // Create separate requests for each season to allow individual management
                for (const seasonNum of seasons) {
                    // Check if this specific season is already requested to avoid duplicates
                    const existingSeasonRequest = await (prisma as any).mediaRequest.findFirst({
                        where: {
                            tmdbId: tmdbId.toString(),
                            mediaType: 'tv',
                            metadata: {
                                contains: `"seasons":[${seasonNum}]`
                            }
                        }
                    })

                    if (existingSeasonRequest) {
                        logger.info(`[Request API] Season ${seasonNum} already requested, skipping duplicate entry creation`)
                        continue
                    }

                    const newRequest = await (prisma as any).mediaRequest.create({
                        data: {
                            externalId: externalId || `pending_${tmdbId}_${Date.now()}_s${seasonNum}`,
                            tmdbId: tmdbId.toString(),
                            mediaType: mediaType,
                            title: title || 'Sans titre',
                            status: requestStatus,
                            userId: dbUser?.id,
                            requesterName: user.name || dbUser?.name,
                            requesterEmail: user.email,
                            metadata: JSON.stringify({
                                posterPath: posterPath,
                                seasons: [seasonNum]
                            }),
                            requestedAt: new Date()
                        }
                    })
                    const { logAction } = await import('@/lib/audit')
                    requestIds.push(newRequest.id)
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id, { tmdbId, mediaType, title, season: seasonNum })
                }
            } else {
                const newRequest = await (prisma as any).mediaRequest.create({
                    data: {
                        externalId: externalId || `pending_${tmdbId}_${Date.now()}`,
                        tmdbId: tmdbId.toString(),
                        mediaType: mediaType,
                        title: title || 'Sans titre',
                        status: requestStatus,
                        userId: dbUser?.id,
                        requesterName: user.name || dbUser?.name,
                        requesterEmail: user.email,
                        metadata: JSON.stringify({
                            posterPath: posterPath,
                            seasons: seasons.length > 0 ? seasons.sort((a, b) => a - b) : undefined
                        }),
                        requestedAt: new Date()
                    }
                })
                const { logAction } = await import('@/lib/audit')
                requestIds.push(newRequest.id)
                await logAction(dbUser?.id || null, 'MEDIA_REQUEST', 'MediaRequest', newRequest.id, { tmdbId, mediaType, title })
            }

            logger.info(`[Request API] Immediate local DB update success for ${title}`)
        } catch (dbError) {
            logger.error('[Request API] Failed to update local DB immediately:', dbError)
            // Non-blocking error, we continue
        }

        // Invalidate cache
        forget(`media_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbId}`)
        revalidatePath('/dashboard/requests/list') // Refresh list immediately

        return { status: 200, body: result, requestIds }
    } else {
        return { status: 500, body: { error: result.message }, requestIds }
    }
  } catch (e) {
    logger.error('Request failed', e)
    return { status: 500, body: { error: (e as Error).message || 'Internal Server Error' }, requestIds }
  }
}
