import { NextResponse } from 'next/server'
import { getRealUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { getSetting } from '@/lib/settings'
import { EmbyService } from '@/lib/services/emby'
import { refreshStaleLastPlayedDates, type StorageMediaRef } from '@/lib/services/item-viewing-stats'
import { invalidateStorageDates } from '@/lib/services/storage-list'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_REFRESH_ITEMS = 80

/**
 * Rafraîchit les dates "Regardé" pour les médias visibles (ou périmés du type demandé).
 */
export async function POST(request: Request) {
    try {
        const user = await getRealUser() as { role: string }
        const ability = defineAbilityFor(user)

        if (!user || (!ability.can('manage_storage', 'Stats') && user?.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let typeFilter: 'Movie' | 'Series' = 'Movie'
        let itemIds: string[] | undefined
        try {
            const body = await request.json().catch(() => ({}))
            if (body?.type === 'Series') typeFilter = 'Series'
            if (Array.isArray(body?.itemIds)) {
                itemIds = body.itemIds.map(String).slice(0, MAX_REFRESH_ITEMS)
            }
        } catch {
            // corps vide
        }

        const embyUrl = await getSetting('emby_url')
        const embyApiKey = await getSetting('emby_api_key')
        if (!embyUrl || !embyApiKey) {
            return NextResponse.json({ error: 'Emby not configured' }, { status: 500 })
        }

        const embyService = new EmbyService(embyUrl, embyApiKey)

        let mediaRefs: StorageMediaRef[]

        if (itemIds?.length) {
            mediaRefs = itemIds.map(id => ({ id, type: typeFilter }))
        } else {
            const items = await embyService.getStorageItems()
            mediaRefs = []
            const seenSeries = new Set<string>()
            for (const item of items) {
                if (typeFilter === 'Movie' && item.Type === 'Movie') {
                    mediaRefs.push({ id: String(item.Id), type: 'Movie' })
                } else if (typeFilter === 'Series' && item.Type === 'Series' && !seenSeries.has(String(item.Id))) {
                    seenSeries.add(String(item.Id))
                    mediaRefs.push({ id: String(item.Id), type: 'Series' })
                }
                if (mediaRefs.length >= MAX_REFRESH_ITEMS) break
            }
        }

        const result = await refreshStaleLastPlayedDates(embyService, mediaRefs)
        invalidateStorageDates()

        return NextResponse.json({ success: true, type: typeFilter, ...result })
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
