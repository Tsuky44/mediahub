import { NextRequest, NextResponse } from 'next/server'
import { getUserMediaServer, getMediaServerUserId, getCurrentUser, withLinkedAccounts } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
    if (!user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mediaService = await getUserMediaServer()
    
    if (!mediaService) {
        return NextResponse.json({ error: 'Media server unavailable' }, { status: 503 })
    }

    const dbUser = await withLinkedAccounts(await db.query.users.findFirst({
        where: eq(users.email, user.email)
    }))

    const mediaUserId = getMediaServerUserId(dbUser, mediaService.flavor)
    if (!mediaUserId) {
        return NextResponse.json({ error: 'Media server user not connected' }, { status: 400 })
    }

        const { embyItemId, isFavorite } = await req.json()

        if (!embyItemId) {
            return NextResponse.json({ error: 'Missing embyItemId' }, { status: 400 })
        }

        await mediaService.updateFavoriteStatus(mediaUserId, embyItemId, isFavorite)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API Favorite] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
