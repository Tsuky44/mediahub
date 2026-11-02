import { timingSafeEqual } from 'crypto'
import { eq, or } from 'drizzle-orm'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'

export interface PlayerIntegrationUser {
  [key: string]: unknown
  id: string
  name: string
  email: string
  role: string
  permissions: Array<{ action: string; subject: string; conditions: string | null }>
}

function isValidKey(providedKey: string, expectedKey: string) {
  const provided = Buffer.from(providedKey)
  const expected = Buffer.from(expectedKey)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export async function authenticatePlayerIntegration(request: Request): Promise<PlayerIntegrationUser | null> {
  const expectedKey = process.env.PLAYER_INTEGRATION_API_KEY?.trim()
  const authorization = request.headers.get('authorization')
  const providedKey = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!expectedKey || !providedKey || !isValidKey(providedKey, expectedKey)) return null

  const playerUsername = request.headers.get('x-player-username')?.trim()
  const playerId = request.headers.get('x-player-id')?.trim()
  const fallbackEmail = process.env.PLAYER_INTEGRATION_USER_EMAIL?.trim()
  const withRole = { roleRef: { with: { permissions: true } } } as const

  // 1) Id stable du compte Onyx (liaison users.onyx_user_id), 2) nom ou email en repli.
  let user = playerId
    ? await db.query.users.findFirst({ where: eq(users.onyxUserId, playerId), with: withRole })
    : null

  if (!user && playerUsername) {
    const byName = await db.query.users.findFirst({
      where: or(eq(users.name, playerUsername), eq(users.email, playerUsername)),
      with: withRole,
    })
    // Un compte déjà lié à un autre compte Onyx n'est pas le même utilisateur qu'un homonyme.
    user = byName && playerId && byName.onyxUserId && byName.onyxUserId !== playerId ? null : byName
  }

  if (!user && fallbackEmail) {
    user = await db.query.users.findFirst({
      where: eq(users.email, fallbackEmail),
      with: { roleRef: { with: { permissions: true } } },
    })
  }

  if (!user) {
    return {
      id: '0',
      name: playerUsername || 'player-unknown',
      email: fallbackEmail || 'player-unknown@mediahub.local',
      role: 'user',
      permissions: [
        { action: 'read', subject: 'Media', conditions: null },
        { action: 'create', subject: 'MediaRequest', conditions: null },
      ],
    }
  }

  return {
    id: String(user.id),
    name: playerUsername || user.name,
    email: user.email,
    role: user.roleRef?.name || user.role,
    permissions: user.roleRef?.permissions || [],
  }
}
