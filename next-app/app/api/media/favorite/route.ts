import { NextRequest, NextResponse } from 'next/server'
import { getEmbyServiceForUser, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
    if (!user || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const embyService = await getEmbyServiceForUser()
    
    if (!embyService) {
        return NextResponse.json({ error: 'Emby service unavailable' }, { status: 503 })
    }

    const dbUser = await (prisma as any).user.findUnique({
        where: { email: user.email }
    })

    if (!dbUser || !dbUser.embyUserId) {
        return NextResponse.json({ error: 'Emby user not connected' }, { status: 400 })
    }

        const { embyItemId, isFavorite } = await req.json()

        if (!embyItemId) {
            return NextResponse.json({ error: 'Missing embyItemId' }, { status: 400 })
        }

        await embyService.updateFavoriteStatus(dbUser.embyUserId, embyItemId, isFavorite)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API Favorite] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
