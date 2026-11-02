import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getLibraryPlatform, getMediaServerType, getRealUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [serverType, libraryPlatform] = await Promise.all([getMediaServerType(), getLibraryPlatform()])

  // Compte issu d'Onyx, ou médiathèque servie par Onyx : la disponibilité s'affiche « sur Onyx »
  // plutôt que sur le serveur média
  let accountOrigin: 'onyx' | null = libraryPlatform === 'onyx' ? 'onyx' : null
  try {
    const user = accountOrigin ? null : await getRealUser()
    if (user) {
      const row = await db.query.users.findFirst({
        where: eq(users.id, parseInt(user.id)),
        columns: { onyxUserId: true },
      })
      if (row?.onyxUserId) accountOrigin = 'onyx'
    }
  } catch {}

  return NextResponse.json({ serverType: serverType || 'emby', accountOrigin })
}
