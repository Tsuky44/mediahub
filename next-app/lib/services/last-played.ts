import 'server-only'
import { db } from '@/lib/db/drizzle'
import { watchEvents, mediaLastPlayed } from '@/lib/db/schema'
import { inArray, eq, and, sql } from 'drizzle-orm'

/**
 * Utilitaires de résolution de la "date de dernière lecture" à partir de la
 * table interne `watch_events` (alimentée par le tracker de l'application).
 *
 * Ces fonctions servent de source complémentaire à la `LastPlayedDate` d'Emby :
 * certains médias marqués comme vus en masse (ou importés) n'ont pas de date
 * côté Emby, alors que le tracker interne l'a enregistrée (ou inversement).
 * On garde donc systématiquement la date la plus récente des deux sources.
 */

/** Retourne la plus récente de deux dates ISO (ou null si aucune). */
export function laterIsoDate(a?: string | null, b?: string | null): string | null {
    if (!a) return b ?? null
    if (!b) return a
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

/**
 * Pour une liste d'itemId (episodes et/ou films), retourne une map
 * itemId -> date ISO de dernière lecture (max de played_at), tous
 * utilisateurs confondus.
 */
export async function getWatchEventDatesByItemIds(
    itemIds: string[]
): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    if (!itemIds.length) return result

    // SQLite limite le nombre de paramètres d'une requête : on découpe.
    const CHUNK = 500
    for (let i = 0; i < itemIds.length; i += CHUNK) {
        const chunk = itemIds.slice(i, i + CHUNK)
        const rows = await db
            .select({
                itemId: watchEvents.itemId,
                last: sql<number>`MAX(${watchEvents.playedAt})`,
            })
            .from(watchEvents)
            .where(inArray(watchEvents.itemId, chunk))
            .groupBy(watchEvents.itemId)

        for (const row of rows) {
            if (row.last) {
                result[row.itemId] = new Date(Number(row.last)).toISOString()
            }
        }
    }

    return result
}

/**
 * Pour une liste d'itemId, retourne une map itemId -> date ISO de dernière
 * lecture, depuis le cache `media_last_played` (backfill depuis Emby UserData).
 * Source complète/historique, contrairement à watch_events / plugin.
 */
export async function getMediaLastPlayedByItemIds(
    itemIds: string[]
): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    if (!itemIds.length) return result

    const CHUNK = 500
    for (let i = 0; i < itemIds.length; i += CHUNK) {
        const chunk = itemIds.slice(i, i + CHUNK)
        const rows = await db
            .select({
                itemId: mediaLastPlayed.itemId,
                last: mediaLastPlayed.lastPlayedAt,
            })
            .from(mediaLastPlayed)
            .where(inArray(mediaLastPlayed.itemId, chunk))

        for (const row of rows) {
            if (row.last) {
                result[row.itemId] = new Date(row.last as unknown as Date).toISOString()
            }
        }
    }

    return result
}

/**
 * Retourne la date ISO de dernière lecture pour un utilisateur donné
 * (par embyUserId) sur un ensemble d'items (film ou épisodes d'une série).
 */
export async function getWatchEventDateForUser(
    embyUserId: string,
    itemIds: string[]
): Promise<string | null> {
    if (!embyUserId || !itemIds.length) return null

    let latest: number | null = null
    const CHUNK = 500
    for (let i = 0; i < itemIds.length; i += CHUNK) {
        const chunk = itemIds.slice(i, i + CHUNK)
        const rows = await db
            .select({ last: sql<number>`MAX(${watchEvents.playedAt})` })
            .from(watchEvents)
            .where(
                and(
                    eq(watchEvents.embyUserId, embyUserId),
                    inArray(watchEvents.itemId, chunk)
                )
            )

        const val = rows[0]?.last
        if (val && (latest === null || Number(val) > latest)) {
            latest = Number(val)
        }
    }

    return latest !== null ? new Date(latest).toISOString() : null
}
