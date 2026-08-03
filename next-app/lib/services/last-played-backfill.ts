import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { mediaLastPlayed } from '@/lib/db/schema'
import type { EmbyService } from '@/lib/services/emby'

/**
 * Backfill de la table `media_last_played` à partir d'Emby.
 *
 * Emby ne renvoie `UserData.LastPlayedDate` que lors de la lecture d'un item
 * UNIQUE (les requêtes de liste renvoient un UserData allégé). On parcourt donc
 * les items ayant une activité (lu / en cours) pour chaque utilisateur, puis on
 * lit la vraie date item par item et on conserve la plus récente par média.
 *
 * C'est la seule source fiable et historique pour la colonne "Regardé" ; le
 * plugin Playback Reporting et le tracker interne n'ont qu'une rétention
 * partielle.
 */

const CONCURRENCY = 12

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

export async function runLastPlayedBackfill(
    emby: EmbyService
): Promise<{ updated: number; scanned: number }> {
    const client = await emby.getClient(30000)
    const users = await emby.getUsers()

    // 1. Collecte des paires (userId, itemId) ayant une activité (rapide).
    const pairs = await collectPlayedPairs(client, users)
    const maxByItem = await readLastPlayedDates(client, pairs)

    await upsertLastPlayedDates(maxByItem)

    return { updated: maxByItem.size, scanned: pairs.length }
}

/**
 * Résout les dates de dernière lecture directement depuis Emby pour une liste
 * d'itemIds (films ou épisodes). Même logique que la modale de détails : lecture
 * unitaire de UserData.LastPlayedDate par utilisateur. Les résultats sont aussi
 * mis en cache dans media_last_played.
 */
export async function resolveLastPlayedDatesFromEmby(
    emby: EmbyService,
    itemIds: string[]
): Promise<Record<string, string>> {
    if (!itemIds.length) return {}

    const client = await emby.getClient(30000)
    const users = await emby.getUsers()
    const targetIds = new Set(itemIds)

    const pairs = await collectPlayedPairs(client, users, targetIds)
    const maxByItem = await readLastPlayedDates(client, pairs)

    if (maxByItem.size > 0) {
        await upsertLastPlayedDates(maxByItem)
    }

    const result: Record<string, string> = {}
    for (const [itemId, v] of maxByItem) {
        result[itemId] = new Date(v.at).toISOString()
    }
    return result
}

async function collectPlayedPairs(
    client: Awaited<ReturnType<EmbyService['getClient']>>,
    users: Array<Record<string, unknown>>,
    targetIds?: Set<string>
): Promise<Array<{ userId: string; itemId: string; itemType: string }>> {
    const pairs: Array<{ userId: string; itemId: string; itemType: string }> = []
    const seen = new Set<string>()
    for (const user of users) {
        const userId = String(user.Id)
        for (const filter of ['IsPlayed', 'IsResumable']) {
            try {
                const res = await client.get(`/Users/${userId}/Items`, {
                    params: {
                        Recursive: true,
                        IncludeItemTypes: 'Movie,Episode',
                        Filters: filter,
                        Fields: 'BasicSyncInfo',
                    },
                })
                for (const it of (res.data.Items || [])) {
                    const itemId = String(it.Id)
                    if (targetIds && !targetIds.has(itemId)) continue
                    const key = `${userId}:${itemId}`
                    if (seen.has(key)) continue
                    seen.add(key)
                    pairs.push({ userId, itemId, itemType: String(it.Type) })
                }
            } catch {
                // liste indisponible pour cet utilisateur : ignoré
            }
        }
    }
    return pairs
}

async function readLastPlayedDates(
    client: Awaited<ReturnType<EmbyService['getClient']>>,
    pairs: Array<{ userId: string; itemId: string; itemType: string }>
): Promise<Map<string, { at: number; type: string }>> {
    const maxByItem = new Map<string, { at: number; type: string }>()
    await mapLimit(pairs, CONCURRENCY, async (p) => {
        try {
            const res = await client.get(`/Users/${p.userId}/Items/${p.itemId}`, {
                params: { Fields: 'UserData' },
            })
            const lpd = res.data?.UserData?.LastPlayedDate
            if (lpd) {
                const t = new Date(lpd).getTime()
                if (!isNaN(t)) {
                    const cur = maxByItem.get(p.itemId)
                    if (!cur || t > cur.at) maxByItem.set(p.itemId, { at: t, type: p.itemType })
                }
            }
        } catch {
            // item indisponible pour cet utilisateur : ignoré
        }
    })
    return maxByItem
}

async function upsertLastPlayedDates(
    maxByItem: Map<string, { at: number; type: string }>
): Promise<void> {
    const now = new Date()
    const entries = Array.from(maxByItem.entries())
    const BATCH = 200
    for (let i = 0; i < entries.length; i += BATCH) {
        const rows = entries.slice(i, i + BATCH).map(([itemId, v]) => ({
            itemId,
            itemType: v.type,
            lastPlayedAt: new Date(v.at),
            updatedAt: now,
        }))
        await db
            .insert(mediaLastPlayed)
            .values(rows)
            .onConflictDoUpdate({
                target: mediaLastPlayed.itemId,
                set: {
                    itemType: sqlExcluded('item_type'),
                    lastPlayedAt: sqlExcluded('last_played_at'),
                    updatedAt: sqlExcluded('updated_at'),
                },
            })
    }
}

// Helper pour référencer les valeurs "excluded" (nouvelle ligne) dans l'upsert.
function sqlExcluded(column: string) {
    return sql.raw(`excluded.${column}`)
}
