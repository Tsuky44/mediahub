import { NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { getSetting } from '@/lib/settings'
import { EmbyService } from '@/lib/services/emby'
import { refreshStaleLastPlayedDates, type StorageMediaRef } from '@/lib/services/item-viewing-stats'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Reconstruit le cache des dates de dernière lecture (media_last_played) en
 * lisant Emby item par item. C'est la source fiable de la colonne "Regardé".
 */
export async function POST() {
    try {
        const user = await getRealUser() as { role: string }
        const ability = defineAbilityFor(user)

        if (!user || (!ability.can('manage_storage', 'Stats') && user?.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const embyUrl = await getSetting('emby_url')
        const embyApiKey = await getSetting('emby_api_key')
        if (!embyUrl || !embyApiKey) {
            return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
        }

        const embyService = new EmbyService(embyUrl, embyApiKey)
        const items = await embyService.getStorageItems()

        const mediaRefs: StorageMediaRef[] = []
        const seenSeries = new Set<string>()
        for (const item of items) {
            if (item.Type === 'Movie') {
                mediaRefs.push({ id: String(item.Id), type: 'Movie' })
            } else if (item.Type === 'Series' && !seenSeries.has(String(item.Id))) {
                seenSeries.add(String(item.Id))
                mediaRefs.push({ id: String(item.Id), type: 'Series' })
            }
        }

        // Force le rafraîchissement de tous les médias (TTL = 0).
        const result = await refreshStaleLastPlayedDates(embyService, mediaRefs, 0)

        return NextResponse.json({ success: true, ...result })
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
