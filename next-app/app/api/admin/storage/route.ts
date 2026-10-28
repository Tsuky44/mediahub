import { NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { EmbyService } from '@/lib/services/emby'
import { SonarrService } from '@/lib/services/sonarr'
import { RadarrService } from '@/lib/services/radarr'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'
import { db } from '@/lib/db/drizzle'
import { mediaRequests, episodeBatches } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { StorageSortDir, StorageSortKey } from '@/app/dashboard/stats/_types/storage'
import { parseFilterParams } from '@/app/dashboard/stats/_utils/storage-filters'
import {
    fetchStoragePage,
    getStorageTotalsIfCached,
    mapEmbyItemToStorageRow,
    removeFromStorageCache,
    scheduleStorageCacheWarmup,
    isMovieIndexReady,
    isSeriesIndexReady,
} from '@/lib/services/storage-list'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };

const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 200
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

    const pageResult = await fetchStoragePage(embyService, typeFilter, {
      page,
      pageSize: limit,
      search,
      sortKey,
      sortDir,
      filters: parseFilterParams(searchParams),
    })

    const totals = getStorageTotalsIfCached() ?? { all: 0, movies: 0, series: 0 }

    // Dates « Regardé » / « Demandé » : calculées par storage-list, identiques à celles
    // utilisées pour le tri et les filtres.
    const rows = pageResult.items.map(item => {
      const row = typeFilter === 'Movie'
        ? mapEmbyItemToStorageRow(item, 'Movie')
        : mapEmbyItemToStorageRow(item, 'Series', {
            size: item._size as number,
            episodesCount: item._episodesCount as number,
          })
      const id = String(row.id)
      row.lastPlayedDate = pageResult.lastPlayed[id] ?? null
      row.requestedAt = pageResult.requested[id] ?? null
      return row
    })

    const total = pageResult.total
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      items: rows,
      totals,
      cacheReady: {
        movies: isMovieIndexReady(),
        series: isSeriesIndexReady(),
        totals: getStorageTotalsIfCached() !== null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      matchedSize: pageResult.totalSize,
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

    removeFromStorageCache(String(itemId), type)

    return NextResponse.json({ success: true })

  } catch (err) {
    error('Storage Delete API Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
