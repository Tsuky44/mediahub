import { NextResponse } from 'next/server'
import { getLibraryPlatform, getRealUser } from '@/lib/auth'
import { getOnyxDirectory, type OnyxDirectory } from '@/lib/services/onyx-directory'
import { fetchOnyxStoragePage, removeFromOnyxStorage } from '@/lib/services/storage-onyx'
import { EmbyService } from '@/lib/services/emby'
import { forgetMedia, ForgetError } from '@/lib/services/media-forget'
import { getSetting } from '@/lib/settings'
import { defineAbilityFor } from '@/lib/ability'
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

/** Client d'Onyx quand Onyx est la plateforme de la médiathèque, sinon null (Emby/Jellyfin). */
async function getStorageOnyx(): Promise<OnyxDirectory | null> {
    if ((await getLibraryPlatform()) !== 'onyx') return null
    return getOnyxDirectory()
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

    const filters = parseFilterParams(searchParams)

    // Onyx est la médiathèque : sa liste à lui, mêmes tri, filtres et pagination qu'avec Emby
    const onyx = await getStorageOnyx()
    if (onyx) {
      const onyxPage = await fetchOnyxStoragePage(onyx, typeFilter, { page, pageSize: limit, search, sortKey, sortDir, filters })
      const onyxPages = Math.max(1, Math.ceil(onyxPage.total / limit))
      return NextResponse.json({
        items: onyxPage.items,
        totals: onyxPage.totals,
        cacheReady: { movies: true, series: true, totals: true },
        pagination: { page, limit, total: onyxPage.total, totalPages: onyxPages, hasMore: page < onyxPages },
        matchedSize: onyxPage.totalSize,
      })
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
      filters,
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
    const { itemId, type, deleteFromArr, providerId, seasonNumber, tmdbId } = body

    if (!itemId) {
        return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const onyx = await getStorageOnyx()
    let embyService: EmbyService | null = null
    if (!onyx) {
        const embyUrl = await getSetting('emby_url')
        const embyApiKey = await getSetting('emby_api_key')
        if (!embyUrl || !embyApiKey) {
            return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
        }
        embyService = new EmbyService(embyUrl, embyApiKey)
    }

    const itemInfo = embyService ? await embyService.getItemDetails(itemId) : null
    const parentId = itemInfo?.SeriesId || itemInfo?.ParentId
    // Série : Emby donne son TMDB ; Onyx n'a que celui envoyé par la page
    const seriesTmdbId = itemInfo?.ProviderIds?.Tmdb ?? tmdbId

    // Le gestionnaire (sorraa ou Radarr/Sonarr) d'abord : s'il echoue, rien ne part du disque,
    // sinon il retelechargerait le titre. Les demandes partent avec, qu'on retire du gestionnaire ou non.
    const forgetType = type === 'Movie' ? 'movie' : 'tv'
    const forgetTmdbId = Number(type === 'Movie' ? (providerId ?? tmdbId) : seriesTmdbId) || 0
    try {
        await forgetMedia({
            tmdbId: forgetTmdbId,
            mediaType: forgetType,
            season: type === 'Season' && seasonNumber !== undefined ? Number(seasonNumber) : undefined,
            // Onyx efface ses fichiers lui-meme ; avec Emby, le gestionnaire s'en charge
            deleteFiles: !onyx,
            tvdbId: type !== 'Movie' && providerId ? Number(providerId) : undefined,
            skipManager: !deleteFromArr,
        })
    } catch (e) {
        if (e instanceof ForgetError) return NextResponse.json({ error: e.message }, { status: 502 })
        throw e
    }

    if (onyx) {
        // Onyx supprime fichiers et dossier ; un échec se dit, l'élément reste dans la liste
        await onyx.deleteStorage(itemId)
    } else if (embyService) {
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
    }

    if (onyx) removeFromOnyxStorage(String(itemId), type)
    else removeFromStorageCache(String(itemId), type)

    return NextResponse.json({ success: true })

  } catch (err) {
    error('Storage Delete API Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
