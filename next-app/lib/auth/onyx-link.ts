import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { roles, users } from '@/lib/db/schema'
import { readSettings } from '@/lib/settings'
import { normalizeOnyxUrl, type OnyxAccount } from '@/lib/services/onyx-auth'

export interface OnyxAuthConfig {
  enabled: boolean
  url: string
  autoCreate: boolean
  defaultRoleId: string | null
}

export async function getOnyxAuthConfig(): Promise<OnyxAuthConfig> {
  const s = await readSettings(['auth_onyx_enabled', 'onyx_url', 'auth_onyx_auto_create', 'default_role_id'] as const)
  return {
    enabled: s.auth_onyx_enabled === 'true',
    url: normalizeOnyxUrl(s.onyx_url),
    // Création automatique : activée tant que l'admin ne l'a pas coupée.
    autoCreate: s.auth_onyx_auto_create !== 'false',
    defaultRoleId: s.default_role_id || null,
  }
}

export class OnyxLinkError extends Error {}

/**
 * Compte MediaHub lié à un compte Onyx. Pas de rapprochement par nom : un
 * homonyme sur Onyx ne doit pas reprendre un compte MediaHub (la liaison
 * passe par `linkOnyxAccount`, faite par son propriétaire connecté).
 */
export async function findUserByOnyxId(onyxUserId: string) {
  return db.query.users.findFirst({
    where: eq(users.onyxUserId, onyxUserId),
    with: { roleRef: true },
  })
}

/** Compte à connecter pour ce compte Onyx : le lié, sinon un nouveau si autorisé. */
export async function resolveOnyxUser(account: OnyxAccount, config: OnyxAuthConfig) {
  const linked = await findUserByOnyxId(account.id)
  if (linked) return linked

  if (!config.autoCreate) {
    throw new OnyxLinkError("Aucun compte MediaHub n'est lié à ce compte Onyx. Demandez à un administrateur ou liez-le depuis votre profil.")
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users)
  const isFirstUser = Number(count) === 0
  const [adminRole] = isFirstUser ? await db.select().from(roles).where(eq(roles.name, 'admin')) : []

  const base = account.username.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || `onyx-${account.id}`
  let email = `${base}@onyx.local`
  if (await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })) {
    email = `${base}.${account.id}@onyx.local`
  }

  const [created] = await db.insert(users).values({
    email,
    name: account.username,
    onyxUserId: account.id,
    role: isFirstUser ? 'admin' : 'user',
    roleId: isFirstUser ? adminRole?.id ?? null : config.defaultRoleId,
  }).returning()
  return (await db.query.users.findFirst({ where: eq(users.id, created.id), with: { roleRef: true } }))!
}

/** Lie un compte MediaHub existant à un compte Onyx (échoue si l'un des deux est déjà lié). */
export async function linkOnyxAccount(userId: number, account: OnyxAccount) {
  const owner = await findUserByOnyxId(account.id)
  if (owner && owner.id !== userId) {
    throw new OnyxLinkError('Ce compte Onyx est déjà lié à un autre compte MediaHub.')
  }
  const current = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { onyxUserId: true } })
  if (!current) throw new OnyxLinkError('Compte MediaHub introuvable.')
  if (current.onyxUserId && current.onyxUserId !== account.id) {
    throw new OnyxLinkError("Votre compte MediaHub est déjà lié à un autre compte Onyx. Déliez-le d'abord.")
  }
  await db.update(users).set({ onyxUserId: account.id }).where(eq(users.id, userId)).run()
}

export async function unlinkOnyxAccount(userId: number) {
  await db.update(users).set({ onyxUserId: null }).where(eq(users.id, userId)).run()
}
