import { NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { EmbyService } from '@/lib/services/emby'
import { SonarrService } from '@/lib/services/sonarr'
import { RadarrService } from '@/lib/services/radarr'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'
import { db } from '@/lib/db/drizzle'
import { mediaRequests, episodeBatches } from '@/lib/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import type { StorageSortDir, StorageSortKey } from '@/app/dashboard/stats/_types/storage'
import {
    fetchMoviesPage,
    fetchSeriesPage,
    getStorageTotalsIfCached,
    mapEmbyItemToStorageRow,
    invalidateStorageListCache,
    scheduleStorageCacheWarmup,
    isFreshMovieCache,
    isFreshSeriesCache,
} from '@/lib/services/storage-list'
import { getCachedLastPlayedDatesForStorage } from '@/lib/services/item-viewing-stats'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100
const VALID_SORT_KEYS: StorageSortKey[] = ['size', 'lastPlayed', 'requested']
const VALID_SORT_DIRS: StorageSortDir[] = ['asc', 'desc']

function parseSort(
    sortBy: string | null,
    sortDir: string | null
): { sortKey?: StorageSortKey; sortDir?: StorageSortDir } {
    const sortKey = VALID_SORT_KEYS.includes(sortBy as StorageSortKey)
        ? (sortBy as StorageSortKey)
        : undefined
    const dir = VALID_SORT_DIRS.includes(sortDir as StorageSortDir)
        ? (sortDir as StorageSortDir)
        : undefined
    return { sortKey, sortDir: dir }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('type')
    const typeFilter: 'Movie' | 'Series' =
      typeParam === 'Series' ? 'Series' : 'Movie'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const search = searchParams.get('search')?.trim() || undefined
    const { sortKey, sortDir } = parseSort(
        searchParams.get('sortBy'),
        searchParams.get('sortDir')
    )

    const user = await getRealUser() as { role: string }
    const ability = defineAbilityFor(user)

    if (!user || (!ability.can('manage_storage', 'Stats') && user?.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')

    if (!embyUrl || !embyApiKey) {
      return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
    }

    const embyService = new EmbyService(embyUrl, embyApiKey)

    // Cache en arrière-plan uniquement — ne pas bloquer ni surcharger Emby pendant la page.
    scheduleStorageCacheWarmup(embyService)

    const pageResult = typeFilter === 'Movie'
      ? await fetchMoviesPage(embyService, page, limit, search, sortKey, sortDir)
      : await fetchSeriesPage(embyService, page, limit, search, sortKey, sortDir)

    const totals = getStorageTotalsIfCached() ?? { all: 0, movies: 0, series: 0 }

    const rows = pageResult.items.map(item =>
      typeFilter === 'Movie'
        ? mapEmbyItemToStorageRow(item, 'Movie')
        : mapEmbyItemToStorageRow(item, 'Series', {
            size: item._size as number,
            episodesCount: item._episodesCount as number,
          })
    )

    const pageIds = rows.map(r => String(r.id))

    // Dates "Regardé" : cache DB uniquement pour la page courante (rapide).
    try {
      if (pageIds.length > 0) {
        const dates =
          typeFilter === 'Movie'
            ? await getCachedLastPlayedDatesForStorage(pageIds, [], new Map())
            : await getCachedLastPlayedDatesForStorage([], pageIds, new Map())

        for (const row of rows) {
          row.lastPlayedDate = dates[String(row.id)] ?? null
        }
      }
    } catch (e) {
      warn('Storage API: last played resolution failed:', (e as Error).message)
    }

    // Dates de demande : requête ciblée sur les ids de la page uniquement.
    try {
      if (pageIds.length > 0) {
        const tmdbIds = rows
          .map(r => (r.tmdbId != null ? String(r.tmdbId) : null))
          .filter((id): id is string => !!id)

        const conditions = [inArray(mediaRequests.embyItemId, pageIds)]
        if (tmdbIds.length > 0) conditions.push(inArray(mediaRequests.tmdbId, tmdbIds))

        const requests = await db
          .select({
            tmdbId: mediaRequests.tmdbId,
            embyItemId: mediaRequests.embyItemId,
            requestedAt: mediaRequests.requestedAt,
          })
          .from(mediaRequests)
          .where(or(...conditions))

        const reqByEmbyId = new Map<string, number>()
        const reqByTmdbId = new Map<string, number>()
        for (const r of requests) {
          const ms = r.requestedAt ? new Date(r.requestedAt).getTime() : NaN
          if (isNaN(ms)) continue
          if (r.embyItemId) {
            const cur = reqByEmbyId.get(r.embyItemId)
            if (cur === undefined || ms > cur) reqByEmbyId.set(r.embyItemId, ms)
          }
          if (r.tmdbId) {
            const cur = reqByTmdbId.get(r.tmdbId)
            if (cur === undefined || ms > cur) reqByTmdbId.set(r.tmdbId, ms)
          }
        }

        for (const row of rows) {
          const embyId = String(row.id)
          const byEmby = reqByEmbyId.get(embyId)
          if (byEmby !== undefined) {
            row.requestedAt = new Date(byEmby).toISOString()
            continue
          }
          if (typeFilter === 'Movie' && row.tmdbId != null) {
            const byTmdb = reqByTmdbId.get(String(row.tmdbId))
            if (byTmdb !== undefined) row.requestedAt = new Date(byTmdb).toISOString()
          }
        }
      }
    } catch (e) {
      warn('Storage API: request date resolution failed:', (e as Error).message)
    }

    const total = pageResult.total
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      items: rows,
      totals,
      cacheReady: {
        movies: isFreshMovieCache(),
        series: isFreshSeriesCache(),
        totals: getStorageTotalsIfCached() !== null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (err) {
    const raw = (err as Error).message || 'Erreur inconnue'
    error('Storage API Error:', err)
    const message = raw.includes('502')
      ? 'Emby/Jellyfin temporairement indisponible'
      : raw
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRealUser() as { role: string }
    const ability = defineAbilityFor(user)

    if (!user || (!ability.can('delete_media', 'Stats') && user?.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, type, deleteFromArr, providerId, seasonNumber } = body

    if (!itemId) {
        return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')
    
    if (!embyUrl || !embyApiKey) {
        return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
    }

    const embyService = new EmbyService(embyUrl, embyApiKey)

    const itemInfo = await embyService.getItemDetails(itemId)
    const parentId = itemInfo?.SeriesId || itemInfo?.ParentId

    if (deleteFromArr) {
        if (type === 'Movie') {
            const radarrUrl = await getSetting('radarr_url')
            const radarrApiKey = await getSetting('radarr_api_key')
            
            if (radarrUrl && radarrApiKey && providerId) {
                const radarrService = new RadarrService(radarrUrl, radarrApiKey)
                try {
                    const movie = await radarrService.getMovieByTmdbId(providerId)
                    if (movie && movie.id) {
                         await radarrService.deleteMovie(movie.id, true)
                    }
                } catch (e) {
                    error('Failed to delete from Radarr:', e)
                }
            }
        } else if (type === 'Series') {
             const sonarrUrl = await getSetting('sonarr_url')
             const sonarrApiKey = await getSetting('sonarr_api_key')
             
             if (sonarrUrl && sonarrApiKey && providerId) {
                 const sonarrService = new SonarrService(sonarrUrl, sonarrApiKey)
                 try {
                     const series = await sonarrService.getSeriesByTvdbId(providerId)
                     if (series && series.id) {
                         await sonarrService.deleteSeries(series.id, true)
                     }
                 } catch (e) {
                     error('Failed to delete Series from Sonarr:', e)
                 }
             }
        } else if (type === 'Season') {
            const sonarrUrl = await getSetting('sonarr_url')
            const sonarrApiKey = await getSetting('sonarr_api_key')
             
             if (sonarrUrl && sonarrApiKey && providerId && seasonNumber !== undefined) {
                 const sonarrService = new SonarrService(sonarrUrl, sonarrApiKey)
                 try {
                     const series = await sonarrService.getSeriesByTvdbId(providerId)
                     if (series && series.id) {
                         await sonarrService.unmonitorSeason(series.id, seasonNumber)
                         
                         try {
                             const files = await sonarrService.getEpisodeFiles(series.id)
                             const seasonFiles = files.filter(f => f.seasonNumber === seasonNumber)
                             
                             log(`Deleting ${seasonFiles.length} files for Season ${seasonNumber} of series ${series.title}`)
                             
                             for (const file of seasonFiles) {
                                 await sonarrService.deleteEpisodeFile(file.id)
                             }
                         } catch (fileError) {
                             error('Failed to delete season files:', fileError)
                         }
                    }
                } catch (e) {
                    error('Failed to unmonitor/delete Season from Sonarr:', e)
                }
            }
        }
    }

    try {
        if (type === 'Season' && parentId && seasonNumber !== undefined) {
            await embyService.deleteEpisodesBySeasonNumber(parentId, seasonNumber)
        }
        await embyService.deleteItem(itemId)
    } catch (e) {
        error('Failed to delete item from Emby:', e)
    }

    if (parentId) {
        log(`Refreshing parent item ${parentId} in Emby`)
        await embyService.refreshItem(parentId)
    }

    if (type === 'Movie' && providerId) {
        try {
            const tmdbIdStr = String(providerId)
            await db.delete(mediaRequests).where(eq(mediaRequests.tmdbId, tmdbIdStr))
            await db.delete(episodeBatches).where(eq(episodeBatches.tmdbId, tmdbIdStr))
            try {
                const { purgeNotifDedupForTmdbId } = await import('@/lib/notifications-v2/bootstrap')
                await purgeNotifDedupForTmdbId(tmdbIdStr)
            } catch (e) { /* ignore */ }
        } catch (e) {
            error('Failed to delete local requests for movie:', e)
        }
    } else if ((type === 'Series') && providerId) {
        try {
            if (itemInfo?.ProviderIds?.Tmdb) {
                const tmdbIdStr = String(itemInfo.ProviderIds.Tmdb)
                await db.delete(mediaRequests).where(eq(mediaRequests.tmdbId, tmdbIdStr))
                await db.delete(episodeBatches).where(eq(episodeBatches.tmdbId, tmdbIdStr))
                try {
                    const { purgeNotifDedupForTmdbId } = await import('@/lib/notifications-v2/bootstrap')
                    await purgeNotifDedupForTmdbId(tmdbIdStr)
                } catch (e) { /* ignore */ }
            }
        } catch (e) {
            error('Failed to delete local requests for series:', e)
        }
    }

    invalidateStorageListCache()

    return NextResponse.json({ success: true })

  } catch (err) {
    error('Storage Delete API Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
