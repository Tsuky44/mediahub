import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSetting } from '@/lib/settings'
import { EmbyService } from '@/lib/services/emby'
import { defineAbilityFor } from '@/lib/ability'
import { enrichViewingStatsWithWatchEvents, aggregatedLastPlayedDate, upsertItemLastPlayedCache, type ViewingStatLike } from '@/lib/services/item-viewing-stats'
import { invalidateStorageDates } from '@/lib/services/storage-list'
import type { StorageMediaInfo } from '@/app/dashboard/stats/_types/storage'

export const dynamic = 'force-dynamic'

function yearOf(value: unknown): number | null {
    if (!value) return null
    const year = new Date(value as string).getFullYear()
    return isNaN(year) ? null : year
}

/** Métadonnées Emby -> fiche affichée en tête du détail. */
function toMediaInfo(item: Record<string, unknown>): StorageMediaInfo {
    const ticks = Number(item.RunTimeTicks) || 0
    return {
        overview: (item.Overview as string) || null,
        year: (item.ProductionYear as number) || yearOf(item.PremiereDate),
        endYear: yearOf(item.EndDate),
        status: (item.Status as string) || null,
        genres: (item.Genres as string[]) ?? [],
        studios: ((item.Studios as Array<{ Name?: string }>) ?? []).map(s => s.Name).filter((n): n is string => !!n).slice(0, 3),
        communityRating: typeof item.CommunityRating === 'number' ? item.CommunityRating : null,
        officialRating: (item.OfficialRating as string) || null,
        // 1 tick = 100 ns
        runtimeMinutes: ticks ? Math.round(ticks / 600_000_000) : null,
        path: (item.Path as string) || null,
    }
}

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

    const id = itemId

    // Activité, saisons et fiche du média chargées en parallèle
    const loadViewingStats = async () => {
        const viewingStats = await embyService.getItemStateForAllUsers(id)

        // Enrichissement watch_events (logique partagée avec la colonne "Regardé").
        await enrichViewingStatsWithWatchEvents(id, viewingStats as ViewingStatLike[])

        // Met à jour le cache pour accélérer les prochains chargements de la liste.
        const aggregatedDate = aggregatedLastPlayedDate(viewingStats as ViewingStatLike[])
        await upsertItemLastPlayedCache(
            id,
            type === 'Series' ? 'Series' : 'Movie',
            aggregatedDate
        )
        invalidateStorageDates()
        return viewingStats
    }

    const [viewingStats, seasons, rawInfo] = await Promise.all([
        loadViewingStats(),
        type === 'Series' ? embyService.getSeasonDetails(id) : Promise.resolve([]),
        embyService.getItemInfo(id),
    ])

    return NextResponse.json({
        viewingStats,
        seasons,
        info: rawInfo ? toMediaInfo(rawInfo) : null,
    })

  } catch (error: any) {
    console.error('Storage Details API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
