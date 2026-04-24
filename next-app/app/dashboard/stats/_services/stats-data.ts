import 'server-only'
import { prisma } from '@/lib/prisma'

export interface StatsScopedUser {
    id: number | string
    name: string
    embyUserId?: string | null
    plexUserId?: string | null
    jellyfinUserId?: string | null
}

/**
 * Recupere les groupes d'utilisateurs et construit une map userId -> group
 * pour agreger les statistiques par groupe.
 */
export async function fetchUserGroupMap(): Promise<Map<string, any>> {
    const userGroups = await prisma.userGroup.findMany({
        include: { members: true },
    })
    const map = new Map<string, any>()
    userGroups.forEach((group: any) => {
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
    const localUsers = await prisma.user.findMany({
        select: { id: true, name: true, embyUserId: true, plexUserId: true, jellyfinUserId: true },
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
    return prisma.watchEvent.findMany({
        where: {
            playedAt: { gte: startDate, lte: endDate },
            ...(!hasGlobalView && hasSelfView
                ? {
                      OR: [
                          { userId: user.id as any },
                          {
                              embyUserId: {
                                  in: [user.embyUserId, user.plexUserId, user.jellyfinUserId].filter(
                                      Boolean
                                  ) as string[],
                              },
                          },
                          { userName: user.name },
                      ],
                  }
                : {}),
        },
        orderBy: { playedAt: 'desc' },
    })
}

/** Retourne la plus ancienne entree d'historique pour guider l'utilisateur en cas de vide. */
export async function fetchOldestWatchEventYear(): Promise<number | null> {
    const oldestLog = await prisma.watchEvent.findFirst({
        orderBy: { playedAt: 'asc' },
        select: { playedAt: true },
    })
    return oldestLog ? new Date(oldestLog.playedAt).getFullYear() : null
}
