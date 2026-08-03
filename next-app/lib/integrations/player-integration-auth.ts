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
  const fallbackEmail = process.env.PLAYER_INTEGRATION_USER_EMAIL?.trim()

  let user = playerUsername
    ? await db.query.users.findFirst({
        where: or(eq(users.name, playerUsername), eq(users.email, playerUsername)),
        with: { roleRef: { with: { permissions: true } } },
      })
    : null

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
