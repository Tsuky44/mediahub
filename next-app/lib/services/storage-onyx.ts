import 'server-only'
import { createMemoCache } from '@/lib/cache'
import { MS } from '@/lib/constants'
import type { OnyxDirectory, OnyxStorageDetails, OnyxStorageItem } from './onyx-directory'
import type { ItemDetails, StorageItem, StorageMediaInfo, StorageTotals, ViewingStat } from '@/app/dashboard/stats/_types/storage'
import { buildRequestedDateMap, queryStorageRows, toTimestamp, type DateMaps, type StoragePageOptions } from './storage-list'

/**
 * Gestionnaire de stockage quand Onyx est la médiathèque (ADR-0114 d'Onyx). Onyx rend en une fois
 * films et séries avec leur taille et leur dernière lecture ; tri, filtres et pagination sont ceux
 * d'Emby (queryStorageRows). La liste est relue en arrière-plan passé une minute, et une suppression
 * la retire de la mémoire sans tout recharger.
 */

type MediaType = 'Movie' | 'Series'

interface OnyxRow {
    id: string
    name: string
    size: number
    addedMs: number | null
    tmdbId?: string
    item: OnyxStorageItem
}

interface OnyxLibrary {
    movies: OnyxRow[]
    series: OnyxRow[]
}

const listCache = createMemoCache({ max: 4, ttl: MS.MINUTE, stale: 30 * MS.MINUTE })
// Suppressions (id -> heure) : retirées d'une liste lue avant elles, encore en cache
const deleted = new Map<string, number>()

function toRow(item: OnyxStorageItem): OnyxRow {
    return {
        id: String(item.id),
        name: item.title,
        size: item.size || 0,
        addedMs: toTimestamp(item.added_at),
        tmdbId: item.tmdb_id ? String(item.tmdb_id) : undefined,
        item,
    }
}

async function loadLibrary(directory: OnyxDirectory): Promise<OnyxLibrary> {
    const list = await listCache.get(`storage:${directory.baseUrl}`, async () => {
        const startedAt = Date.now()
        const data = await directory.storage()
        for (const [id, at] of deleted) if (at < startedAt) deleted.delete(id)
        return {
            movies: (data?.movies ?? []).map(toRow),
            series: (data?.shows ?? []).map(toRow),
        }
    })
    if (!deleted.size) return list
    return {
        movies: list.movies.filter(r => !deleted.has(r.id)),
        series: list.series.filter(r => !deleted.has(r.id)),
    }
}

function totalsOf(library: OnyxLibrary): StorageTotals {
    const sum = (rows: OnyxRow[]) => rows.reduce((acc, r) => acc + r.size, 0)
    const movies = sum(library.movies)
    const series = sum(library.series)
    return { all: movies + series, movies, series }
}

function toStorageItem(type: MediaType, row: OnyxRow, dates: { lastPlayed: string | null; requested: string | null }): StorageItem {
    return {
        id: row.id,
        name: row.name,
        type,
        size: row.size,
        path: row.item.path || undefined,
        isPlaying: false,
        addedAt: row.item.added_at ?? '',
        tmdbId: row.item.tmdb_id || undefined,
        episodesCount: type === 'Series' ? row.item.episode_count ?? 0 : undefined,
        lastPlayedDate: dates.lastPlayed,
        requestedAt: dates.requested,
    }
}

async function datesOf(type: MediaType, rows: OnyxRow[]): Promise<DateMaps> {
    return {
        lastPlayed: new Map(rows.map(r => [r.id, r.item.last_played_at ?? null])),
        requested: await buildRequestedDateMap(type, rows, false),
    }
}

export interface OnyxStoragePage {
    items: StorageItem[]
    totals: StorageTotals
    total: number
    totalSize: number
}

export async function fetchOnyxStoragePage(
    directory: OnyxDirectory,
    type: MediaType,
    options: StoragePageOptions
): Promise<OnyxStoragePage> {
    const library = await loadLibrary(directory)
    const rows = type === 'Movie' ? library.movies : library.series
    const result = await queryStorageRows(rows, options, {
        library: () => datesOf(type, rows),
        page: slice => datesOf(type, slice),
    })
    return {
        items: result.slice.map(r => toStorageItem(type, r, {
            lastPlayed: result.lastPlayed[r.id] ?? null,
            requested: result.requested[r.id] ?? null,
        })),
        totals: totalsOf(library),
        total: result.total,
        totalSize: result.totalSize,
    }
}

/** Id Onyx du film ou de la série d'id TMDB donné (fiche média → activité des comptes). */
export async function findOnyxStorageId(directory: OnyxDirectory, tmdbId: number, type: MediaType): Promise<string | null> {
    const library = await loadLibrary(directory)
    const rows = type === 'Movie' ? library.movies : library.series
    return rows.find(r => r.item.tmdb_id === tmdbId)?.id ?? null
}

/** Retire un média supprimé de la liste en mémoire ; une saison change la taille de sa série. */
export function removeFromOnyxStorage(id: string, type: MediaType | 'Season'): void {
    if (type === 'Season') {
        listCache.clear()
        return
    }
    deleted.set(id, Date.now())
}

const TICKS_PER_SECOND = 10_000_000

function yearOf(value?: string): number | null {
    if (!value) return null
    const year = new Date(value).getFullYear()
    return isNaN(year) ? null : year
}

function percent(part: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0
}

/** Détail Onyx -> forme affichée par le détail du stockage (la même qu'avec Emby). */
export function toItemDetails(details: OnyxStorageDetails): ItemDetails {
    const show = details.type === 'show'
    const viewingStats: ViewingStat[] = details.viewers.map(v => {
        const watched = v.watched_episodes ?? 0
        const total = v.total_episodes ?? 0
        return {
            userId: String(v.user_id),
            userName: v.username,
            played: v.finished,
            lastPlayedDate: v.last_played_at ?? null,
            playbackPositionTicks: v.position_seconds * TICKS_PER_SECOND,
            totalDurationTicks: v.duration_seconds * TICKS_PER_SECOND,
            percentage: show ? percent(watched, total) : percent(v.position_seconds, v.duration_seconds),
            ...(show ? {
                playedEpisodes: watched,
                totalEpisodes: total,
                seasons: (v.seasons ?? []).map(s => ({
                    seasonNumber: s.number,
                    total: s.total,
                    played: s.watched,
                    percentage: percent(s.watched, s.total),
                })),
            } : {}),
        }
    })
    const info: StorageMediaInfo = {
        overview: details.overview || null,
        year: yearOf(details.release_date),
        endYear: null,
        status: null,
        genres: [],
        studios: [],
        communityRating: null,
        officialRating: null,
        runtimeMinutes: details.duration ? Math.round(details.duration / 60) : null,
        path: details.path || null,
    }
    return {
        viewingStats,
        seasons: details.seasons.map(s => ({
            id: String(s.id),
            name: s.title,
            index: s.number,
            size: s.size,
            episodesCount: s.episode_count,
            path: s.path,
        })),
        info,
    }
}
