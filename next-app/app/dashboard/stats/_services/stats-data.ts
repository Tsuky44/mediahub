import 'server-only'
import { db } from '@/lib/db/drizzle'
import { userGroups, users, watchEvents } from '@/lib/db/schema'
import { eq, and, or, gte, lte, inArray, desc, asc } from 'drizzle-orm'

export interface StatsScopedUser {
    id: number | string
    name?: string | null
    embyUserId?: string | null
    plexUserId?: string | null
    jellyfinUserId?: string | null
}

/**
 * Recupere les groupes d'utilisateurs et construit une map userId -> group
 * pour agreger les statistiques par groupe.
 */
export async function fetchUserGroupMap(): Promise<Map<string, any>> {
    const groups = await db.query.userGroups.findMany({
        with: { members: true },
    })
    const map = new Map<string, any>()
    groups.forEach((group: any) => {
        group.members.forEach((member: any) => {
            map.set(`${member.userId}`, group)
        })
    })
    return map
}

/**
 * Construit une map ProviderID -> LocalUserName (Emby/Plex/Jellyfin -> nom local)
 * pour fusionner les activites d'un meme utilisateur via differents providers.
 */
export async function fetchProviderIdToLocalUserMap(): Promise<Map<string, string>> {
    const localUsers = await db.query.users.findMany({
        columns: { id: true, name: true, embyUserId: true, plexUserId: true, jellyfinUserId: true },
    })
    const map = new Map<string, string>()
    localUsers.forEach(u => {
        const name = u.name || ''
        if (u.embyUserId) map.set(u.embyUserId, name)
        if (u.plexUserId) map.set(u.plexUserId, name)
        if (u.jellyfinUserId) map.set(u.jellyfinUserId, name)
    })
    return map
}

/**
 * Recupere les WatchEvent sur la periode, en restreignant au user courant
 * s'il n'a pas la permission `read_all`.
 */
export async function fetchWatchHistory(
    startDate: Date,
    endDate: Date,
    user: StatsScopedUser,
    hasGlobalView: boolean,
    hasSelfView: boolean
): Promise<any[]> {
    const baseConditions = [gte(watchEvents.playedAt, startDate), lte(watchEvents.playedAt, endDate)]
    
    if (!hasGlobalView && hasSelfView) {
        const externalIds = [user.embyUserId, user.plexUserId, user.jellyfinUserId].filter(Boolean) as string[]
        const userConditions = []
        userConditions.push(eq(watchEvents.userId, user.id as any))
        if (externalIds.length > 0) {
            userConditions.push(inArray(watchEvents.embyUserId, externalIds))
        }
        if (user.name) {
            userConditions.push(eq(watchEvents.userName, user.name))
        }
        baseConditions.push(or(...userConditions)!)
    }
    
    return db.query.watchEvents.findMany({
        where: and(...baseConditions),
        orderBy: [desc(watchEvents.playedAt)],
    })
}

/** Retourne la plus ancienne entree d'historique pour guider l'utilisateur en cas de vide. */
export async function fetchOldestWatchEventYear(): Promise<number | null> {
    const oldestLog = await db.query.watchEvents.findFirst({
        orderBy: [asc(watchEvents.playedAt)],
        columns: { playedAt: true },
    })
    return oldestLog ? new Date(oldestLog.playedAt).getFullYear() : null
}
