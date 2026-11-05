import 'server-only'
import { cache } from 'react'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { users, userGroupMembers } from '@/lib/db/schema'

/** Comptes de plateforme d'un utilisateur MediaHub */
export interface PlatformAccountIds {
  embyUserId: string | null
  jellyfinUserId: string | null
  plexUserId: string | null
  onyxUserId: string | null
}

const PLATFORM_KEYS = ['embyUserId', 'jellyfinUserId', 'plexUserId', 'onyxUserId'] as const

/**
 * Comptes du groupe « comptes liés » de l'utilisateur (lui compris), ou null s'il n'est dans aucun
 * groupe d'au moins deux comptes. Un groupe où deux membres ont chacun un compte sur la même
 * plateforme réunit des personnes distinctes (groupe de rôle) : il n'est pas pris pour une identité.
 */
export const getLinkedAccounts = cache(async (userId: number): Promise<PlatformAccountIds[] | null> => {
  const memberships = await db
    .select({ groupId: userGroupMembers.userGroupId })
    .from(userGroupMembers)
    .where(eq(userGroupMembers.userId, userId))

  for (const { groupId } of memberships) {
    const members = await db
      .select({ userId: userGroupMembers.userId })
      .from(userGroupMembers)
      .where(eq(userGroupMembers.userGroupId, groupId))
    if (members.length < 2) continue

    const accounts = await db.query.users.findMany({
      where: inArray(users.id, members.map((m) => m.userId)),
      columns: { embyUserId: true, jellyfinUserId: true, plexUserId: true, onyxUserId: true },
    })
    const ambiguous = PLATFORM_KEYS.some((key) => accounts.filter((a) => a[key]).length > 1)
    if (!ambiguous) return accounts
  }
  return null
})

/**
 * Compte complété par les comptes de son groupe « comptes liés » : un compte Plex groupé avec un
 * compte Emby lit la bibliothèque Emby avec l'identifiant Emby du groupe. Les identifiants propres
 * du compte passent toujours en premier.
 */
export async function withLinkedAccounts<T extends { id: number } & Partial<PlatformAccountIds>>(
  dbUser: T | null | undefined
): Promise<T | null | undefined> {
  if (!dbUser) return dbUser
  try {
    const linked = await getLinkedAccounts(dbUser.id)
    if (!linked) return dbUser
    const merged: Record<string, unknown> = { ...dbUser }
    for (const key of PLATFORM_KEYS) {
      if (!merged[key]) merged[key] = linked.find((a) => a[key])?.[key] ?? merged[key] ?? null
    }
    return merged as T
  } catch {
    return dbUser
  }
}
