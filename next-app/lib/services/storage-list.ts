import 'server-only'
import type { EmbyService } from './emby'
import type { StorageSortDir, StorageSortKey, StorageTotals } from '@/app/dashboard/stats/_types/storage'
import { getCachedLastPlayedDatesForStorage } from './item-viewing-stats'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'

const CACHE_TTL_MS = 20 * 60 * 1000

interface CacheEntry<T> {
    value: T
    at: number
}

let totalsCache: CacheEntry<StorageTotals> | null = null
let totalsBuild: Promise<StorageTotals> | null = null

interface SeriesSizeData {
    sizeMap: Map<string, { size: number; episodesCount: number }>
    episodeToSeries: Map<string, string>
}

let seriesSizeCache: CacheEntry<SeriesSizeData> | null = null
let seriesSizeBuild: Promise<SeriesSizeData> | null = null

interface MovieRow {
    item: Record<string, unknown>
    size: number
}

let movieRowsCache: CacheEntry<MovieRow[]> | null = null
let movieRowsBuild: Promise<MovieRow[]> | null = null

interface SeriesRow {
    item: Record<string, unknown>
    size: number
    episodesCount: number
}

let seriesRowsCache: CacheEntry<SeriesRow[]> | null = null
let seriesRowsBuild: Promise<SeriesRow[]> | null = null

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    return !!entry && Date.now() - entry.at < CACHE_TTL_MS
}

export function getStorageTotalsIfCached(): StorageTotals | null {
    return isFresh(totalsCache) ? totalsCache.value : null
}

export function isFreshMovieCache(): boolean {
    return isFresh(movieRowsCache)
}

export function isFreshSeriesCache(): boolean {
    return isFresh(seriesRowsCache) && isFresh(seriesSizeCache)
}

export function invalidateStorageListCache(): void {
    totalsCache = null
    seriesSizeCache = null
    seriesRowsCache = null
    movieRowsCache = null
    seriesSizeBuild = null
    movieRowsBuild = null
    seriesRowsBuild = null
    totalsBuild = null
}

function itemSize(item: Record<string, unknown>): number {
    const sources = item.MediaSources as Array<Record<string, unknown>> | undefined
    if (!sources?.length) return 0
    return sources.reduce((acc, src) => acc + ((src.Size as number) || 0), 0)
}

async function getSeriesSizeData(emby: EmbyService): Promise<SeriesSizeData> {
    if (isFresh(seriesSizeCache)) return seriesSizeCache.value
    if (seriesSizeBuild) return seriesSizeBuild

    seriesSizeBuild = (async () => {
        const sizeMap = new Map<string, { size: number; episodesCount: number }>()
        const episodeToSeries = new Map<string, string>()
        const client = await emby.getClient(120000)
        const limit = 1000
        let start = 0

        for (;;) {
            const res = await client.get('/Items', {
                params: {
                    Recursive: true,
                    IncludeItemTypes: 'Episode',
                    Fields: 'MediaSources,SeriesId',
                    StartIndex: start,
                    Limit: limit,
                    IsVirtualItem: false,
                },
            })
            const batch: Array<Record<string, unknown>> = res.data?.Items || []
            for (const ep of batch) {
                const seriesId = ep.SeriesId != null ? String(ep.SeriesId) : null
                if (!seriesId) continue
                episodeToSeries.set(String(ep.Id), seriesId)
                const size = itemSize(ep)
                const cur = sizeMap.get(seriesId) ?? { size: 0, episodesCount: 0 }
                cur.size += size
                cur.episodesCount += 1
                sizeMap.set(seriesId, cur)
            }
            if (batch.length < limit) break
            start += limit
        }

        const data: SeriesSizeData = { sizeMap, episodeToSeries }
        seriesSizeCache = { value: data, at: Date.now() }
        seriesRowsCache = null
        return data
    })().finally(() => { seriesSizeBuild = null })

    return seriesSizeBuild
}

export async function getSeriesSizeMap(
    emby: EmbyService
): Promise<Map<string, { size: number; episodesCount: number }>> {
    return (await getSeriesSizeData(emby)).sizeMap
}

export async function getStorageTotals(emby: EmbyService): Promise<StorageTotals> {
    if (isFresh(totalsCache)) return totalsCache.value
    if (totalsBuild) return totalsBuild

    totalsBuild = (async () => {
        const client = await emby.getClient(120000)
        let movies = 0
        let start = 0
        const limit = 1000

        for (;;) {
            const res = await client.get('/Items', {
                params: {
                    Recursive: true,
                    IncludeItemTypes: 'Movie',
                    Fields: 'MediaSources',
                    StartIndex: start,
                    Limit: limit,
                    IsVirtualItem: false,
                },
            })
            const batch: Array<Record<string, unknown>> = res.data?.Items || []
            for (const m of batch) movies += itemSize(m)
            if (batch.length < limit) break
            start += limit
        }

        const seriesMap = await getSeriesSizeMap(emby)
        let series = 0
        for (const v of seriesMap.values()) series += v.size

        const totals: StorageTotals = { all: movies + series, movies, series }
        totalsCache = { value: totals, at: Date.now() }
        return totals
    })().finally(() => { totalsBuild = null })

    return totalsBuild
}

export interface StoragePageResult {
    items: Array<Record<string, unknown>>
    total: number
}

const DEFAULT_SORT_KEY: StorageSortKey = 'size'
const DEFAULT_SORT_DIR: StorageSortDir = 'desc'

function normalizeSort(sortKey?: StorageSortKey, sortDir?: StorageSortDir) {
    return { key: sortKey ?? DEFAULT_SORT_KEY, dir: sortDir ?? DEFAULT_SORT_DIR }
}

function sortTimestamp(value?: string | null): number {
    if (!value) return -Infinity
    const ms = new Date(value).getTime()
    return isNaN(ms) ? -Infinity : ms
}

function compareSortValues(a: number, b: number, dir: StorageSortDir): number {
    if (a === b) return 0
    return dir === 'desc' ? b - a : a - b
}

async function getAllMovieRows(emby: EmbyService): Promise<MovieRow[]> {
    if (isFresh(movieRowsCache)) return movieRowsCache.value
    if (movieRowsBuild) return movieRowsBuild

    movieRowsBuild = (async () => {
        const client = await emby.getClient(120000)
        const allMovies: Array<Record<string, unknown>> = []
        let start = 0
        const limit = 500

        for (;;) {
            const res = await client.get('/Items', {
                params: {
                    Recursive: true,
                    IncludeItemTypes: 'Movie',
                    Fields: 'Path,MediaSources,ProviderIds,DateCreated',
                    StartIndex: start,
                    Limit: limit,
                    SortBy: 'SortName',
                    IsVirtualItem: false,
                },
            })
            const batch: Array<Record<string, unknown>> = res.data?.Items || []
            allMovies.push(...batch)
            if (batch.length < limit) break
            start += limit
        }

        const rows = allMovies.map(m => ({ item: m, size: itemSize(m) }))
        movieRowsCache = { value: rows, at: Date.now() }
        return rows
    })().finally(() => { movieRowsBuild = null })

    return movieRowsBuild
}

async function getAllSeriesRows(emby: EmbyService): Promise<SeriesRow[]> {
    if (isFresh(seriesRowsCache)) return seriesRowsCache.value
    if (seriesRowsBuild) return seriesRowsBuild

    seriesRowsBuild = (async () => {
        const sizeMap = isFresh(seriesSizeCache)
            ? seriesSizeCache.value.sizeMap
            : new Map<string, { size: number; episodesCount: number }>()
        const client = await emby.getClient(120000)
        const allSeries: Array<Record<string, unknown>> = []
        let start = 0
        const limit = 500

        for (;;) {
            const res = await client.get('/Items', {
                params: {
                    Recursive: true,
                    IncludeItemTypes: 'Series',
                    Fields: 'Path,ProviderIds,DateCreated',
                    StartIndex: start,
                    Limit: limit,
                    SortBy: 'SortName',
                    IsVirtualItem: false,
                },
            })
            const batch: Array<Record<string, unknown>> = res.data?.Items || []
            allSeries.push(...batch)
            if (batch.length < limit) break
            start += limit
        }

        const rows: SeriesRow[] = allSeries.map(s => {
            const id = String(s.Id)
            const stats = sizeMap.get(id) ?? { size: 0, episodesCount: 0 }
            return { item: s, size: stats.size, episodesCount: stats.episodesCount }
        })

        seriesRowsCache = { value: rows, at: Date.now() }
        return rows
    })().finally(() => { seriesRowsBuild = null })

    return seriesRowsBuild
}

async function buildRequestedDateMap(
    ids: string[],
    tmdbById: Map<string, string | undefined>
): Promise<Record<string, string | null>> {
    if (!ids.length) return {}

    const requests = await db
        .select({
            tmdbId: mediaRequests.tmdbId,
            embyItemId: mediaRequests.embyItemId,
            requestedAt: mediaRequests.requestedAt,
        })
        .from(mediaRequests)

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

    const result: Record<string, string | null> = {}
    for (const id of ids) {
        const byEmby = reqByEmbyId.get(id)
        if (byEmby !== undefined) {
            result[id] = new Date(byEmby).toISOString()
            continue
        }
        const tmdb = tmdbById.get(id)
        if (tmdb) {
            const byTmdb = reqByTmdbId.get(tmdb)
            result[id] = byTmdb !== undefined ? new Date(byTmdb).toISOString() : null
        } else {
            result[id] = null
        }
    }
    return result
}

async function sortMovieRows(
    rows: MovieRow[],
    sortKey: StorageSortKey,
    sortDir: StorageSortDir
): Promise<MovieRow[]> {
    if (sortKey === 'size') {
        return [...rows].sort((a, b) => compareSortValues(a.size, b.size, sortDir))
    }

    const ids = rows.map(r => String(r.item.Id))
    const tmdbById = new Map(
        rows.map(r => {
            const providers = r.item.ProviderIds as Record<string, unknown> | undefined
            return [String(r.item.Id), providers?.Tmdb != null ? String(providers.Tmdb) : undefined] as const
        })
    )

    if (sortKey === 'lastPlayed') {
        const dates = await getCachedLastPlayedDatesForStorage(ids, [], new Map())
        return [...rows].sort((a, b) => {
            const va = sortTimestamp(dates[String(a.item.Id)])
            const vb = sortTimestamp(dates[String(b.item.Id)])
            return compareSortValues(va, vb, sortDir)
        })
    }

    const dates = await buildRequestedDateMap(ids, tmdbById)
    return [...rows].sort((a, b) => {
        const va = sortTimestamp(dates[String(a.item.Id)])
        const vb = sortTimestamp(dates[String(b.item.Id)])
        return compareSortValues(va, vb, sortDir)
    })
}

async function sortSeriesRows(
    rows: SeriesRow[],
    sortKey: StorageSortKey,
    sortDir: StorageSortDir
): Promise<SeriesRow[]> {
    if (sortKey === 'size') {
        return [...rows].sort((a, b) => compareSortValues(a.size, b.size, sortDir))
    }

    const ids = rows.map(r => String(r.item.Id))
    const tmdbById = new Map(
        rows.map(r => {
            const providers = r.item.ProviderIds as Record<string, unknown> | undefined
            return [String(r.item.Id), providers?.Tmdb != null ? String(providers.Tmdb) : undefined] as const
        })
    )

    if (sortKey === 'lastPlayed') {
        const episodeToSeries = isFresh(seriesSizeCache)
            ? seriesSizeCache.value.episodeToSeries
            : new Map<string, string>()
        const dates = await getCachedLastPlayedDatesForStorage([], ids, episodeToSeries)
        return [...rows].sort((a, b) => {
            const va = sortTimestamp(dates[String(a.item.Id)])
            const vb = sortTimestamp(dates[String(b.item.Id)])
            return compareSortValues(va, vb, sortDir)
        })
    }

    const dates = await buildRequestedDateMap(ids, tmdbById)
    return [...rows].sort((a, b) => {
        const va = sortTimestamp(dates[String(a.item.Id)])
        const vb = sortTimestamp(dates[String(b.item.Id)])
        return compareSortValues(va, vb, sortDir)
    })
}

function paginateMovieRows(rows: MovieRow[], page: number, pageSize: number): StoragePageResult {
    const total = rows.length
    const slice = rows.slice((page - 1) * pageSize, page * pageSize)
    return { items: slice.map(r => r.item), total }
}

function paginateSeriesRows(rows: SeriesRow[], page: number, pageSize: number): StoragePageResult {
    const total = rows.length
    const slice = rows.slice((page - 1) * pageSize, page * pageSize)
    return {
        items: slice.map(r => ({ ...r.item, _size: r.size, _episodesCount: r.episodesCount })),
        total,
    }
}

/** Une seule requête Emby paginée — pas de SortBy=Size (provoque des 502). */
async function fetchMoviesPageFast(
    emby: EmbyService,
    page: number,
    pageSize: number,
    search?: string
): Promise<StoragePageResult> {
    const client = await emby.getClient(20000)
    const params: Record<string, unknown> = {
        Recursive: true,
        IncludeItemTypes: 'Movie',
        Fields: 'Path,MediaSources,ProviderIds,DateCreated',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        StartIndex: (page - 1) * pageSize,
        Limit: pageSize,
        IsVirtualItem: false,
    }
    const q = search?.trim()
    if (q) params.SearchTerm = q

    const res = await client.get('/Items', { params })
    return {
        items: res.data?.Items || [],
        total: Number(res.data?.TotalRecordCount) || 0,
    }
}

async function fetchSeriesPageFast(
    emby: EmbyService,
    page: number,
    pageSize: number,
    search?: string
): Promise<StoragePageResult> {
    const client = await emby.getClient(20000)
    const params: Record<string, unknown> = {
        Recursive: true,
        IncludeItemTypes: 'Series',
        Fields: 'Path,ProviderIds,DateCreated',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        StartIndex: (page - 1) * pageSize,
        Limit: pageSize,
        IsVirtualItem: false,
    }
    const q = search?.trim()
    if (q) params.SearchTerm = q

    const res = await client.get('/Items', { params })
    const sizeMap = isFresh(seriesSizeCache) ? seriesSizeCache.value.sizeMap : new Map()

    return {
        items: (res.data?.Items || []).map((s: Record<string, unknown>) => {
            const id = String(s.Id)
            const stats = sizeMap.get(id) ?? { size: 0, episodesCount: 0 }
            return { ...s, _size: stats.size, _episodesCount: stats.episodesCount }
        }),
        total: Number(res.data?.TotalRecordCount) || 0,
    }
}

/** Prépare les caches en arrière-plan (mutex, ne bloque pas l'API). */
export function scheduleStorageCacheWarmup(emby: EmbyService): void {
    if (!isFresh(movieRowsCache) && !movieRowsBuild) {
        void getAllMovieRows(emby).catch(() => {})
    }
    if (!isFresh(seriesSizeCache) && !seriesSizeBuild) {
        void getSeriesSizeData(emby)
            .then(() => {
                if (!isFresh(seriesRowsCache) && !seriesRowsBuild) {
                    void getAllSeriesRows(emby).catch(() => {})
                }
            })
            .catch(() => {})
    }
    if (!isFresh(totalsCache) && !totalsBuild) {
        void getStorageTotals(emby).catch(() => {})
    }
}

export function warmSeriesSizeCache(emby: EmbyService): void {
    scheduleStorageCacheWarmup(emby)
}

function canSortSeriesFromCache(sort: { key: StorageSortKey; dir: StorageSortDir }): boolean {
    if (!isFresh(seriesRowsCache)) return false
    if (sort.key === 'size' && !isFresh(seriesSizeCache)) return false
    return true
}

export async function fetchMoviesPage(
    emby: EmbyService,
    page: number,
    pageSize: number,
    search?: string,
    sortKey?: StorageSortKey,
    sortDir?: StorageSortDir
): Promise<StoragePageResult> {
    const sort = normalizeSort(sortKey, sortDir)

    if (isFresh(movieRowsCache)) {
        let rows = await getAllMovieRows(emby)
        const q = search?.trim().toLowerCase()
        if (q) rows = rows.filter(r => String(r.item.Name || '').toLowerCase().includes(q))
        rows = await sortMovieRows(rows, sort.key, sort.dir)
        return paginateMovieRows(rows, page, pageSize)
    }

    return fetchMoviesPageFast(emby, page, pageSize, search)
}

export async function fetchSeriesPage(
    emby: EmbyService,
    page: number,
    pageSize: number,
    search?: string,
    sortKey?: StorageSortKey,
    sortDir?: StorageSortDir
): Promise<StoragePageResult> {
    const sort = normalizeSort(sortKey, sortDir)

    if (canSortSeriesFromCache(sort)) {
        let rows = await getAllSeriesRows(emby)
        const q = search?.trim().toLowerCase()
        if (q) rows = rows.filter(r => String(r.item.Name || '').toLowerCase().includes(q))
        rows = await sortSeriesRows(rows, sort.key, sort.dir)
        return paginateSeriesRows(rows, page, pageSize)
    }

    return fetchSeriesPageFast(emby, page, pageSize, search)
}

export function mapEmbyItemToStorageRow(
    item: Record<string, unknown>,
    type: 'Movie' | 'Series',
    extras?: { size?: number; episodesCount?: number }
): Record<string, unknown> {
    const size = extras?.size ?? itemSize(item)
    const base = {
        id: item.Id,
        name: item.Name,
        type,
        size,
        path: item.Path,
        isPlaying: false,
        activeUser: null,
        addedAt: item.DateCreated,
        lastPlayedDate: null,
        requestedAt: null,
    }
    if (type === 'Movie') {
        const providers = item.ProviderIds as Record<string, unknown> | undefined
        return { ...base, tmdbId: providers?.Tmdb }
    }
    const providers = item.ProviderIds as Record<string, unknown> | undefined
    return {
        ...base,
        episodesCount: extras?.episodesCount ?? (item._episodesCount as number) ?? 0,
        tvdbId: providers?.Tvdb,
        size: extras?.size ?? (item._size as number) ?? size,
    }
}
