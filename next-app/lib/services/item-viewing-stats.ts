import 'server-only'
import { sql } from 'drizzle-orm'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaLastPlayed } from '@/lib/db/schema'
import type { EmbyService } from '@/lib/services/emby'
import {
    getWatchEventDateForUser,
    getWatchEventDatesByItemIds,
    getMediaLastPlayedByItemIds,
    laterIsoDate,
} from '@/lib/services/last-played'

export interface ViewingStatLike {
    userId: string
    lastPlayedDate?: string | null
    episodeIds?: unknown[]
}

const CONCURRENCY = 6
/** Durée au-delà de laquelle une entrée cache est considérée comme périmée. */
export const LAST_PLAYED_CACHE_TTL_MS = 6 * 60 * 60 * 1000

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let cursor = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const i = cursor++
            results[i] = await fn(items[i])
        }
    })
    await Promise.all(workers)
    return results
}

/**
 * Enrichit les stats utilisateur avec watch_events (même logique que la modale).
 */
export async function enrichViewingStatsWithWatchEvents(
    itemId: string,
    viewingStats: ViewingStatLike[]
): Promise<void> {
    await Promise.all(
        viewingStats.map(async (stat) => {
            const ids: string[] =
                Array.isArray(stat.episodeIds) && stat.episodeIds.length > 0
                    ? stat.episodeIds.map((id) => String(id))
                    : [itemId]

            const dbDate = await getWatchEventDateForUser(String(stat.userId), ids)
            stat.lastPlayedDate = laterIsoDate(stat.lastPlayedDate, dbDate)
        })
    )
}

/**
 * Date de dernière lecture agrégée (max tous utilisateurs) à partir des stats enrichies.
 */
export function aggregatedLastPlayedDate(viewingStats: ViewingStatLike[]): string | null {
    let max: string | null = null
    for (const stat of viewingStats) {
        max = laterIsoDate(max, stat.lastPlayedDate)
    }
    return max
}

/**
 * Résout la date "Regardé" d'un média avec exactement la même logique que la modale,
 * puis met à jour le cache DB.
 */
export async function getItemLastPlayedDate(
    emby: EmbyService,
    itemId: string,
    itemType: 'Movie' | 'Series' = 'Movie'
): Promise<string | null> {
    const viewingStats = (await emby.getItemStateForAllUsers(itemId)) as ViewingStatLike[]
    await enrichViewingStatsWithWatchEvents(itemId, viewingStats)
    const date = aggregatedLastPlayedDate(viewingStats)
    await upsertItemLastPlayedCache(itemId, itemType, date)
    return date
}

/** Écrit ou met à jour une date dans le cache `media_last_played`. */
export async function upsertItemLastPlayedCache(
    itemId: string,
    itemType: string,
    date: string | null
): Promise<void> {
    if (!date) return
    const playedAt = new Date(date)
    if (isNaN(playedAt.getTime())) return
    const now = new Date()
    await db
        .insert(mediaLastPlayed)
        .values({
            itemId,
            itemType,
            lastPlayedAt: playedAt,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: mediaLastPlayed.itemId,
            set: {
                itemType: sql.raw('excluded.item_type'),
                lastPlayedAt: sql.raw('excluded.last_played_at'),
                updatedAt: sql.raw('excluded.updated_at'),
            },
        })
}

/**
 * Lecture rapide depuis le cache DB (+ watch_events). Utilisé pour afficher la
 * liste de stockage sans interroger Emby item par item.
 */
export async function getCachedLastPlayedDatesForStorage(
    movieIds: string[],
    seriesIds: string[],
    episodeToSeries: Map<string, string>
): Promise<Record<string, string | null>> {
    const episodeIds = Array.from(episodeToSeries.keys())
    const allIds = [...movieIds, ...seriesIds, ...episodeIds]

    const [cacheDates, watchDates] = await Promise.all([
        getMediaLastPlayedByItemIds(allIds),
        getWatchEventDatesByItemIds(allIds),
    ])

    const dateForItem = (itemId: string): string | null =>
        laterIsoDate(cacheDates[itemId], watchDates[itemId])

    const result: Record<string, string | null> = {}

    for (const id of movieIds) {
        result[id] = dateForItem(id)
    }

    // Un seul passage sur les épisodes (au lieu d'un par série)
    const wantedSeries = new Set(seriesIds)
    for (const seriesId of seriesIds) {
        result[seriesId] = dateForItem(seriesId)
    }
    for (const [epId, sId] of episodeToSeries) {
        if (wantedSeries.has(sId)) result[sId] = laterIsoDate(result[sId], dateForItem(epId))
    }

    return result
}

export interface StorageMediaRef {
    id: string
    type: 'Movie' | 'Series'
}

/**
 * Rafraîchit via Emby (logique modale) les entrées absentes ou périmées du cache.
 */
export async function refreshStaleLastPlayedDates(
    emby: EmbyService,
    mediaItems: StorageMediaRef[],
    staleAfterMs = LAST_PLAYED_CACHE_TTL_MS
): Promise<{ updated: number; skipped: number }> {
    if (!mediaItems.length) return { updated: 0, skipped: 0 }

    const ids = mediaItems.map(m => m.id)
    const rows = await db
        .select({
            itemId: mediaLastPlayed.itemId,
            updatedAt: mediaLastPlayed.updatedAt,
        })
        .from(mediaLastPlayed)
        .where(inArray(mediaLastPlayed.itemId, ids))

    const updatedAtById = new Map(
        rows.map(r => [r.itemId, new Date(r.updatedAt as unknown as Date).getTime()])
    )
    const now = Date.now()

    const toRefresh = mediaItems.filter(m => {
        const updated = updatedAtById.get(m.id)
        if (updated === undefined) return true
        return now - updated > staleAfterMs
    })

    await mapLimit(toRefresh, CONCURRENCY, async (item) => {
        await getItemLastPlayedDate(emby, item.id, item.type)
    })

    return { updated: toRefresh.length, skipped: mediaItems.length - toRefresh.length }
}

/**
 * Résout les dates pour plusieurs médias (films ou séries) en parallèle limité.
 */
export async function getItemLastPlayedDates(
    emby: EmbyService,
    items: StorageMediaRef[]
): Promise<Record<string, string | null>> {
    if (!items.length) return {}

    const results = await mapLimit(items, CONCURRENCY, async (item) => ({
        itemId: item.id,
        date: await getItemLastPlayedDate(emby, item.id, item.type),
    }))

    const map: Record<string, string | null> = {}
    for (const { itemId, date } of results) {
        map[itemId] = date
    }
    return map
}
