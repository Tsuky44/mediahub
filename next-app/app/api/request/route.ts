import { NextRequest, NextResponse } from 'next/server'
import { jellyseerrService } from '@/lib/services/jellyseerr'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'
import { forget } from '@/lib/cache'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tmdbId, mediaType, title, posterPath } = body

    if (!tmdbId || !mediaType) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Auto-detect Jellyseerr User
    let jellyseerrUserId: string | undefined = undefined
    try {
        const jsUser = await jellyseerrService.findUserByEmailOrName(session.user?.email || undefined, session.user?.name || undefined)
        if (jsUser) {
            jellyseerrUserId = String(jsUser.id)
            console.log(`[Jellyseerr] Auto-mapped user ${session.user?.name} to JS ID ${jellyseerrUserId}`)
        }
    } catch (e) {
        console.warn('[Jellyseerr] Auto-mapping failed, falling back to global default')
    }

    // Fallback to global setting if auto-detect failed
    if (!jellyseerrUserId) {
        jellyseerrUserId = await getSetting('jellyseerr_user_id')
    }

    const result = await jellyseerrService.requestMedia(tmdbId, mediaType, title, jellyseerrUserId || undefined)
    
    if (result.success) {
        // Invalidate cache
        forget(`jellyseerr_availability_${mediaType}_${tmdbId}`)
        revalidatePath(`/dashboard/media/${tmdbId}`)

        // Enregistrer la demande localement pour le système de notifications
        try {
            const dbUser = await prisma.user.findUnique({
                where: { email: session.user?.email || '' }
            })
            
            if (dbUser) {
                await prisma.mediaRequest.create({
                    data: {
                        userId: dbUser.id,
                        mediaType,
                        tmdbId: String(tmdbId),
                        title,
                        status: 'pending',
                        metadata: JSON.stringify({ posterPath })
                    }
                })
            }
        } catch (dbError) {
            console.error('[Database] Failed to save local request:', dbError)
            // On ne bloque pas la réponse car la demande Jellyseerr a réussi
        }

        return NextResponse.json(result)
    } else {
        return NextResponse.json({ error: result.message }, { status: 500 })
    }

  } catch (e) {
    console.error('Request failed', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
