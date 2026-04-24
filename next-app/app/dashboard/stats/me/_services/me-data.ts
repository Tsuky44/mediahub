import 'server-only'
import { prisma } from '@/lib/prisma'

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
    const or: any[] = []

    if (!isNaN(user.id)) {
        or.push({ userId: user.id })
    }
    if (user.externalIds.length > 0) {
        or.push({ embyUserId: { in: user.externalIds } })
    }
    if (user.name) {
        or.push({ userName: user.name })
    }

    if (or.length === 0) return []

    return prisma.watchEvent.findMany({
        where: {
            OR: or,
            playedAt: { gte: startDate, lte: endDate },
        },
        orderBy: { playedAt: 'desc' },
    })
}
