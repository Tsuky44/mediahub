import 'server-only'
import type { EmbyService } from './emby'
import type { StorageFilters, StorageSortDir, StorageSortKey, StorageTotals } from '@/app/dashboard/stats/_types/storage'
import { countActiveFilters, matchesDateFilter } from '@/app/dashboard/stats/_utils/storage-filters'
import { getCachedLastPlayedDatesForStorage } from './item-viewing-stats'
import { db } from '@/lib/db/drizzle'
import { mediaRequests } from '@/lib/db/schema'

/**
 * Index de la bibliothèque pour le gestionnaire de stockage.
 *
 * Les listes complètes (films, séries, tailles des épisodes) sont chargées une
 * fois depuis Emby puis servies depuis la mémoire : tri, filtres et pagination
 * portent sur toute la bibliothèque. Passé CACHE_TTL_MS, la version en mémoire
 * reste servie pendant sa reconstruction en arrière-plan (stale-while-revalidate),
 * et une suppression retire l'élément sans vider le cache : l'ordre des pages ne
 * change donc pas en cours de « Charger plus ».
 */

type MediaType = 'Movie' | 'Series'

const CACHE_TTL_MS = 20 * 60 * 1000
/** Dates « Regardé » / « Demandé » de toute la bibliothèque (tri et filtres). */
const DATES_TTL_MS = 20 * 1000
const BYTES_PER_GB = 1024 ** 3

interface SwrCache<T> {
    peek(): T | null
    get(emby: EmbyService): Promise<T>
    warm(emby: EmbyService): void
    /** Modifie la valeur en mémoire (et celle d'une reconstruction en cours). */
    update(patch: (value: T) => T): void
    markStale(): void
}

function createSwrCache<T>(build: (emby: EmbyService) => Promise<T>): SwrCache<T> {
    let entry: { value: T; at: number } | null = null
    let pending: Promise<T> | null = null
    let patches: Array<(value: T) => T> = []

    const isStale = () => !entry || Date.now() - entry.at >= CACHE_TTL_MS

    const rebuild = (emby: EmbyService): Promise<T> => {
        if (!pending) {
            patches = []
            pending = build(emby)
                .then(value => {
                    // Une suppression faite pendant la reconstruction s'applique aussi au résultat
                    const patched = patches.reduce((v, patch) => patch(v), value)
                    entry = { value: patched, at: Date.now() }
                    return patched
                })
                .finally(() => {
                    pending = null
                    patches = []
                })
        }
        return pending
    }

    return {
        peek: () => entry?.value ?? null,
        get(emby) {
            if (!entry) return rebuild(emby)
            if (isStale()) void rebuild(emby).catch(() => {})
            return Promise.resolve(entry.value)
        },
        warm(emby) {
            if (isStale()) void rebuild(emby).catch(() => {})
        },
        update(patch) {
            if (entry) entry = { value: patch(entry.value), at: entry.at }
            if (pending) patches.push(patch)
        },
        markStale() {
            if (entry) entry = { value: entry.value, at: 0 }
        },
    }
}

interface LibraryRow {
    id: string
    item: Record<string, unknown>
    name: string
    size: number
    episodesCount: number
    tmdbId?: string
    addedMs: number | null
}

interface SeriesSizeData {
    sizeMap: Map<string, { size: number; episodesCount: number }>
    episodeToSeries: Map<string, string>
}

function itemSize(item: Record<string, unknown>): number {
    const sources = item.MediaSources as Array<Record<string, unknown>> | undefined
    if (!sources?.length) return 0
    return sources.reduce((acc, src) => acc + ((src.Size as number) || 0), 0)
}

function toTimestamp(value: unknown): number | null {
    if (!value) return null
    const ms = new Date(value as string).getTime()
    return isNaN(ms) ? null : ms
}

function toLibraryRow(item: Record<string, unknown>, size: number, episodesCount = 0): LibraryRow {
    const providers = item.ProviderIds as Record<string, unknown> | undefined
    return {
        id: String(item.Id),
        item,
        name: String(item.Name || ''),
        size,
        episodesCount,
        tmdbId: providers?.Tmdb != null ? String(providers.Tmdb) : undefined,
        addedMs: toTimestamp(item.DateCreated),
    }
}

/** Parcourt toutes les pages d'une requête Emby /Items. */
async function fetchAllItems(
    emby: EmbyService,
    params: Record<string, unknown>,
    limit: number,
    onBatch: (batch: Array<Record<string, unknown>>) => void
): Promise<void> {
    const client = await emby.getClient(120000)
    for (let start = 0; ; start += limit) {
        const res = await client.get('/Items', {
            params: { Recursive: true, IsVirtualItem: false, ...params, StartIndex: start, Limit: limit },
        })
        const batch: Array<Record<string, unknown>> = res.data?.Items || []
        onBatch(batch)
        if (batch.length < limit) break
    }
}

const movies = createSwrCache<LibraryRow[]>(async emby => {
    const rows: LibraryRow[] = []
    await fetchAllItems(
        emby,
        { IncludeItemTypes: 'Movie', Fields: 'Path,MediaSources,ProviderIds,DateCreated', SortBy: 'SortName' },
        500,
        batch => { for (const m of batch) rows.push(toLibraryRow(m, itemSize(m))) }
    )
    return rows
})

const seriesItems = createSwrCache<Array<Record<string, unknown>>>(async emby => {
    const items: Array<Record<string, unknown>> = []
    await fetchAllItems(
        emby,
        { IncludeItemTypes: 'Series', Fields: 'Path,ProviderIds,DateCreated', SortBy: 'SortName' },
        500,
        batch => { items.push(...batch) }
    )
    return items
})

const seriesSizes = createSwrCache<SeriesSizeData>(async emby => {
    const sizeMap = new Map<string, { size: number; episodesCount: number }>()
    const episodeToSeries = new Map<string, string>()
    await fetchAllItems(
        emby,
        { IncludeItemTypes: 'Episode', Fields: 'MediaSources,SeriesId' },
        1000,
        batch => {
            for (const ep of batch) {
                const seriesId = ep.SeriesId != null ? String(ep.SeriesId) : null
                if (!seriesId) continue
                episodeToSeries.set(String(ep.Id), seriesId)
                const cur = sizeMap.get(seriesId) ?? { size: 0, episodesCount: 0 }
                cur.size += itemSize(ep)
                cur.episodesCount += 1
                sizeMap.set(seriesId, cur)
            }
        }
    )
    return { sizeMap, episodeToSeries }
})

function seriesRows(items: Array<Record<string, unknown>>, sizes: SeriesSizeData | null): LibraryRow[] {
    return items.map(s => {
        const stats = sizes?.sizeMap.get(String(s.Id))
        return toLibraryRow(s, stats?.size ?? 0, stats?.episodesCount ?? 0)
    })
}

// --- État du cache ---------------------------------------------------------

export function isMovieIndexReady(): boolean {
    return movies.peek() !== null
}

export function isSeriesIndexReady(): boolean {
    return seriesItems.peek() !== null && seriesSizes.peek() !== null
}

/** Totaux déduits des listes en mémoire (plus de parcours Emby dédié). */
export function getStorageTotalsIfCached(): StorageTotals | null {
    const movieRows = movies.peek()
    const sizes = seriesSizes.peek()
    if (!movieRows || !sizes) return null
    let movieTotal = 0
    for (const r of movieRows) movieTotal += r.size
    let seriesTotal = 0
    for (const v of sizes.sizeMap.values()) seriesTotal += v.size
    return { all: movieTotal + seriesTotal, movies: movieTotal, series: seriesTotal }
}

/** Prépare les caches en arrière-plan (construction unique, ne bloque pas l'API). */
export function scheduleStorageCacheWarmup(emby: EmbyService): void {
    movies.warm(emby)
    seriesItems.warm(emby)
    seriesSizes.warm(emby)
}

/** Retire un média supprimé des listes en mémoire, sans tout recharger. */
export function removeFromStorageCache(itemId: string, type: MediaType | 'Season'): void {
    invalidateStorageDates()
    if (type === 'Movie') {
        movies.update(rows => rows.filter(r => r.id !== itemId))
    } else if (type === 'Series') {
        seriesItems.update(items => items.filter(s => String(s.Id) !== itemId))
        seriesSizes.update(({ sizeMap, episodeToSeries }) => {
            const nextSizes = new Map(sizeMap)
            nextSizes.delete(itemId)
            const nextEpisodes = new Map<string, string>()
            for (const [ep, s] of episodeToSeries) if (s !== itemId) nextEpisodes.set(ep, s)
            return { sizeMap: nextSizes, episodeToSeries: nextEpisodes }
        })
    } else {
        // Saison : la taille de la série change, recalculée au prochain accès
        seriesSizes.markStale()
    }
}

// --- Dates « Regardé » / « Demandé » ----------------------------------------

interface DateMaps {
    lastPlayed: Map<string, string | null>
    requested: Map<string, string | null>
}

const dateIndexes: Partial<Record<MediaType, DateMaps & { at: number }>> = {}

/** À appeler quand des dates de lecture changent (synchronisation, fiche détail). */
export function invalidateStorageDates(): void {
    delete dateIndexes.Movie
    delete dateIndexes.Series
}

async function buildRequestedDateMap(type: MediaType, rows: LibraryRow[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>()
    if (!rows.length) return result

    const requests = await db
        .select({
            tmdbId: mediaRequests.tmdbId,
            embyItemId: mediaRequests.embyItemId,
            mediaType: mediaRequests.mediaType,
            requestedAt: mediaRequests.requestedAt,
        })
        .from(mediaRequests)

    // Un id TMDB de film et un id TMDB de série peuvent être identiques : on filtre par type
    const tmdbMediaType = type === 'Movie' ? 'movie' : 'tv'
    const reqByEmbyId = new Map<string, number>()
    const reqByTmdbId = new Map<string, number>()
    for (const r of requests) {
        const ms = toTimestamp(r.requestedAt)
        if (ms == null) continue
        if (r.embyItemId) {
            const cur = reqByEmbyId.get(r.embyItemId)
            if (cur === undefined || ms > cur) reqByEmbyId.set(r.embyItemId, ms)
        }
        if (r.tmdbId && r.mediaType === tmdbMediaType) {
            const cur = reqByTmdbId.get(r.tmdbId)
            if (cur === undefined || ms > cur) reqByTmdbId.set(r.tmdbId, ms)
        }
    }

    for (const row of rows) {
        const ms = reqByEmbyId.get(row.id) ?? (row.tmdbId ? reqByTmdbId.get(row.tmdbId) : undefined)
        result.set(row.id, ms !== undefined ? new Date(ms).toISOString() : null)
    }
    return result
}

async function buildLastPlayedMap(
    type: MediaType,
    rows: LibraryRow[],
    episodeToSeries: Map<string, string>
): Promise<Map<string, string | null>> {
    const ids = rows.map(r => r.id)
    let dates: Record<string, string | null>
    if (type === 'Movie') {
        dates = await getCachedLastPlayedDatesForStorage(ids, [], new Map())
    } else {
        // Seulement les épisodes des séries demandées
        const wanted = new Set(ids)
        const episodes = new Map<string, string>()
        for (const [ep, s] of episodeToSeries) if (wanted.has(s)) episodes.set(ep, s)
        dates = await getCachedLastPlayedDatesForStorage([], ids, episodes)
    }
    return new Map(ids.map(id => [id, dates[id] ?? null]))
}

async function computeDates(type: MediaType, rows: LibraryRow[], episodeToSeries: Map<string, string>): Promise<DateMaps> {
    const [lastPlayed, requested] = await Promise.all([
        buildLastPlayedMap(type, rows, episodeToSeries),
        buildRequestedDateMap(type, rows),
    ])
    return { lastPlayed, requested }
}

/** Dates de toute la bibliothèque, réutilisées quelques secondes entre les pages. */
async function getLibraryDates(type: MediaType, rows: LibraryRow[], episodeToSeries: Map<string, string>): Promise<DateMaps> {
    const cached = dateIndexes[type]
    if (cached && Date.now() - cached.at < DATES_TTL_MS && rows.every(r => cached.lastPlayed.has(r.id))) {
        return cached
    }
    const dates = await computeDates(type, rows, episodeToSeries)
    dateIndexes[type] = { ...dates, at: Date.now() }
    return dates
}

// --- Pages ------------------------------------------------------------------

export interface StoragePageOptions {
    page: number
    pageSize: number
    search?: string
    sortKey?: StorageSortKey
    sortDir?: StorageSortDir
    filters: StorageFilters
}

export interface StoragePageResult {
    items: Array<Record<string, unknown>>
    total: number
    /** Taille cumulée de tous les résultats (null si inconnue : index pas encore prêt) */
    totalSize: number | null
    /** Dates par id d'élément de la page (ISO, null si absente) */
    lastPlayed: Record<string, string | null>
    requested: Record<string, string | null>
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

function toPageItem(type: MediaType, row: LibraryRow): Record<string, unknown> {
    return type === 'Movie'
        ? row.item
        : { ...row.item, _size: row.size, _episodesCount: row.episodesCount }
}

function pickDates(rows: LibraryRow[], dates: DateMaps) {
    const lastPlayed: Record<string, string | null> = {}
    const requested: Record<string, string | null> = {}
    for (const r of rows) {
        lastPlayed[r.id] = dates.lastPlayed.get(r.id) ?? null
        requested[r.id] = dates.requested.get(r.id) ?? null
    }
    return { lastPlayed, requested }
}

/** Tri, filtres et pagination sur toute la bibliothèque (depuis la mémoire). */
async function fetchLibraryPage(emby: EmbyService, type: MediaType, options: StoragePageOptions): Promise<StoragePageResult> {
    const { filters, page, pageSize } = options
    const sortKey = options.sortKey ?? 'size'
    const sortDir = options.sortDir ?? 'desc'

    let library: LibraryRow[]
    let episodeToSeries = new Map<string, string>()
    if (type === 'Movie') {
        library = await movies.get(emby)
    } else {
        const [items, sizes] = await Promise.all([seriesItems.get(emby), seriesSizes.get(emby)])
        library = seriesRows(items, sizes)
        episodeToSeries = sizes.episodeToSeries
    }

    const now = Date.now()
    const q = options.search?.trim().toLowerCase()
    const minSize = filters.minSizeGb * BYTES_PER_GB
    let rows = library.filter(r =>
        (!q || r.name.toLowerCase().includes(q)) &&
        r.size >= minSize &&
        matchesDateFilter(r.addedMs, filters.added, now)
    )

    const needsDates = filters.watched.mode !== 'any' || filters.requested.mode !== 'any' || sortKey !== 'size'
    const libraryDates = needsDates ? await getLibraryDates(type, library, episodeToSeries) : null

    if (libraryDates) {
        rows = rows.filter(r =>
            matchesDateFilter(toTimestamp(libraryDates.lastPlayed.get(r.id)), filters.watched, now) &&
            matchesDateFilter(toTimestamp(libraryDates.requested.get(r.id)), filters.requested, now)
        )
    }

    if (sortKey === 'size') {
        rows.sort((a, b) => compareSortValues(a.size, b.size, sortDir))
    } else {
        const dates = sortKey === 'lastPlayed' ? libraryDates!.lastPlayed : libraryDates!.requested
        rows.sort((a, b) => compareSortValues(sortTimestamp(dates.get(a.id)), sortTimestamp(dates.get(b.id)), sortDir))
    }

    let totalSize = 0
    for (const r of rows) totalSize += r.size

    const slice = rows.slice((page - 1) * pageSize, page * pageSize)
    const pageDates = libraryDates ?? await computeDates(type, slice, episodeToSeries)
    return {
        items: slice.map(r => toPageItem(type, r)),
        total: rows.length,
        totalSize,
        ...pickDates(slice, pageDates),
    }
}

/**
 * Première ouverture, avant que l'index soit prêt : une seule requête Emby paginée
 * (ordre d'ajout). Pas de SortBy=Size côté Emby (provoque des 502).
 */
async function fetchEmbyPage(emby: EmbyService, type: MediaType, options: StoragePageOptions): Promise<StoragePageResult> {
    const { page, pageSize } = options
    const client = await emby.getClient(20000)
    const params: Record<string, unknown> = {
        Recursive: true,
        IncludeItemTypes: type,
        Fields: type === 'Movie' ? 'Path,MediaSources,ProviderIds,DateCreated' : 'Path,ProviderIds,DateCreated',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        StartIndex: (page - 1) * pageSize,
        Limit: pageSize,
        IsVirtualItem: false,
    }
    const q = options.search?.trim()
    if (q) params.SearchTerm = q

    const res = await client.get('/Items', { params })
    const sizes = seriesSizes.peek()
    const rows = (res.data?.Items || []).map((item: Record<string, unknown>) => {
        if (type === 'Movie') return toLibraryRow(item, itemSize(item))
        const stats = sizes?.sizeMap.get(String(item.Id))
        return toLibraryRow(item, stats?.size ?? 0, stats?.episodesCount ?? 0)
    })

    const dates = await computeDates(type, rows, sizes?.episodeToSeries ?? new Map())
    return {
        items: rows.map((r: LibraryRow) => toPageItem(type, r)),
        total: Number(res.data?.TotalRecordCount) || 0,
        totalSize: null,
        ...pickDates(rows, dates),
    }
}

export async function fetchStoragePage(
    emby: EmbyService,
    type: MediaType,
    options: StoragePageOptions
): Promise<StoragePageResult> {
    const indexReady = type === 'Movie' ? isMovieIndexReady() : isSeriesIndexReady()
    // Un tri choisi ou un filtre ne peut être exact que sur toute la bibliothèque :
    // on attend alors l'index plutôt que de renvoyer un ordre faux.
    const needsLibrary = options.sortKey !== undefined || countActiveFilters(options.filters) > 0
    return indexReady || needsLibrary
        ? fetchLibraryPage(emby, type, options)
        : fetchEmbyPage(emby, type, options)
}

export function mapEmbyItemToStorageRow(
    item: Record<string, unknown>,
    type: MediaType,
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
