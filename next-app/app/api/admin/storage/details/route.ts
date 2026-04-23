import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { EmbyService } from '@/lib/services/emby'
import { prisma } from '@/lib/prisma'
import { defineAbilityFor } from '@/lib/ability'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || (!ability.can('manage_storage', 'Stats') && user?.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let itemId = searchParams.get('itemId')
    const type = searchParams.get('type')
    const tmdbId = searchParams.get('tmdbId')

    // Initialize Emby Service
    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')

    if (!embyUrl || !embyApiKey) {
      return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
    }

    const embyService = new EmbyService(embyUrl, embyApiKey)

    // If tmdbId is provided, resolve it to itemId
    if (tmdbId && !itemId) {
        const embyUserId = (user as any).embyUserId
        if (embyUserId) {
            const item = await embyService.getItemByTmdbId(embyUserId, parseInt(tmdbId), type as any)
            if (item) {
                itemId = item.Id
            }
        }
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required or not found' }, { status: 400 })
    }

    // 1. Get viewing status for all users
    const viewingStats = await embyService.getItemStateForAllUsers(itemId)

    // Enhance viewingStats with Prisma EmbyActivityLog data (ALWAYS use internal DB for date as requested)
    /*
    for (const stat of viewingStats) {
        try {
            // Find latest activity for this user and this item (or series)
            // We use episode IDs if available (Series), or itemId (Movie/Episode)
            // We also check mediaInfo just in case
            const whereClause: any = {
                embyUserId: stat.userId
            }

            if (stat.episodeIds && stat.episodeIds.length > 0) {
                // For Series: Check if any episode was played
                whereClause.itemId = { in: stat.episodeIds }
            } else {
                // For Movies/Episodes: Check exact item ID or if mediaInfo contains it
                whereClause.OR = [
                    { itemId: itemId },
                    { mediaInfo: { contains: itemId } }
                ]
            }

            const lastLog = await prisma.embyActivityLog.findFirst({
                where: whereClause,
                orderBy: {
                    startTime: 'desc'
                }
            })

            if (lastLog) {
                // Always overwrite with DB data as it's the source of truth for history
                stat.lastPlayedDate = lastLog.startTime.toISOString()
                
                // If it's an episode, update the text to show the last watched episode
                if (lastLog.itemType === 'Episode' && lastLog.mediaInfo) {
                    try {
                        const info = JSON.parse(lastLog.mediaInfo)
                        if (info.seasonIndex !== undefined && info.episodeIndex !== undefined) {
                            stat.episodeText = `Dernier : S${info.seasonIndex}E${info.episodeIndex}`
                        }
                    } catch (e) {
                        // Ignore parse error
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to fetch activity log for user ${stat.userId} item ${itemId}:`, e)
        }
    }
    */

    // 2. If Series, get seasons details
    let seasons: any[] = []
    if (type === 'Series') {
        seasons = await embyService.getSeasonDetails(itemId)
    }

    return NextResponse.json({
        viewingStats,
        seasons
    })

  } catch (error: any) {
    console.error('Storage Details API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
