import 'server-only'
import { db } from '@/lib/db/drizzle'
import { watchEvents } from '@/lib/db/schema'
import { eq, and, or, gte, lte, inArray, desc } from 'drizzle-orm'

export interface MeScopedUser {
    id: number
    name?: string | null
    externalIds: string[]
}

/**
 * Recupere l'historique de visionnage pour un utilisateur,
 * en matchant par ID interne OU ID externe (Emby/Plex/Jellyfin) OU nom d'utilisateur.
 */
export async function fetchMyWatchHistory(
    user: MeScopedUser,
    startDate: Date,
    endDate: Date
): Promise<any[]> {
    const orConditions: any[] = []

    if (!isNaN(user.id)) {
        orConditions.push(eq(watchEvents.userId, user.id))
    }
    if (user.externalIds.length > 0) {
        orConditions.push(inArray(watchEvents.embyUserId, user.externalIds))
    }
    if (user.name) {
        orConditions.push(eq(watchEvents.userName, user.name))
    }

    if (orConditions.length === 0) return []

    return db.query.watchEvents.findMany({
        where: and(
            or(...orConditions),
            gte(watchEvents.playedAt, startDate),
            lte(watchEvents.playedAt, endDate)
        ),
        orderBy: [desc(watchEvents.playedAt)],
    })
}
