import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { EmbyService } from '@/lib/services/emby'
import { defineAbilityFor } from '@/lib/ability'
import { enrichViewingStatsWithWatchEvents, aggregatedLastPlayedDate, upsertItemLastPlayedCache, type ViewingStatLike } from '@/lib/services/item-viewing-stats'
import { invalidateStorageDates } from '@/lib/services/storage-list'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
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

    // Enrichissement watch_events (logique partagée avec la colonne "Regardé").
    await enrichViewingStatsWithWatchEvents(itemId, viewingStats as ViewingStatLike[])

    // Met à jour le cache pour accélérer les prochains chargements de la liste.
    const aggregatedDate = aggregatedLastPlayedDate(viewingStats as ViewingStatLike[])
    await upsertItemLastPlayedCache(
        itemId,
        type === 'Series' ? 'Series' : 'Movie',
        aggregatedDate
    )
    invalidateStorageDates()

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
