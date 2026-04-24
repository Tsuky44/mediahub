'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    getConfiguredTrackers,
    addTrackerConfig,
    updateTrackerConfig,
    deleteTrackerConfig,
    testTrackerConnection,
    getAllTrackerStats,
    importTrackersFromProwlarr,
    debugProwlarrData,
} from '../tracker-stats-actions'
import type { TrackerConfig, TrackerFormData, TrackerStat } from '../_types/tracker'

export interface UseTrackerConfigsResult {
    trackers: TrackerConfig[]
    stats: TrackerStat[]
    loading: boolean
    refreshing: boolean
    importing: boolean
    testingId: string | null
    reload: (force?: boolean) => Promise<void>
    add: (data: TrackerFormData) => Promise<boolean>
    update: (id: string, data: TrackerFormData) => Promise<boolean>
    remove: (id: string) => Promise<boolean>
    test: (tracker: any) => Promise<void>
    importFromProwlarr: () => Promise<void>
    debugProwlarr: () => Promise<void>
}

/**
 * Gere les configurations de trackers (CRUD) ainsi que la collecte des stats
 * et les operations d'import/debug Prowlarr.
 */
export function useTrackerConfigs(): UseTrackerConfigsResult {
    const [trackers, setTrackers] = useState<TrackerConfig[]>([])
    const [stats, setStats] = useState<TrackerStat[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [importing, setImporting] = useState(false)
    const [testingId, setTestingId] = useState<string | null>(null)

    const reload = useCallback(async (force = false) => {
        try {
            const [trackersRes, statsRes] = await Promise.all([
                getConfiguredTrackers(),
                getAllTrackerStats(force),
            ])
            setTrackers(trackersRes.configs)
            setStats(statsRes.formatted)
        } catch (e) {
            console.error('Failed to load tracker data:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    const add = useCallback(async (data: TrackerFormData): Promise<boolean> => {
        const res = await addTrackerConfig(data)
        if (res.success) {
            await reload()
            return true
        }
        alert(res.error)
        return false
    }, [reload])

    const update = useCallback(async (id: string, data: TrackerFormData): Promise<boolean> => {
        const res = await updateTrackerConfig(id, data)
        if (res.success) {
            await reload()
            return true
        }
        alert(res.error)
        return false
    }, [reload])

    const remove = useCallback(async (id: string): Promise<boolean> => {
        if (!confirm('Supprimer ce tracker ?')) return false
        const res = await deleteTrackerConfig(id)
        if (res.success) {
            await reload()
            return true
        }
        alert(res.error)
        return false
    }, [reload])

    const test = useCallback(async (tracker: any) => {
        setTestingId(tracker.id)
        try {
            const res = await testTrackerConnection({
                ...tracker,
                apiKey: tracker.apiKey === '***hidden***' ? undefined : tracker.apiKey,
            })
            if (res.success) {
                alert(`Connexion réussie !\nRatio: ${res.stats?.ratio.toFixed(2)}\nUpload: ${res.stats?.uploaded}`)
            } else {
                alert(`Erreur: ${res.error}`)
            }
        } finally {
            setTestingId(null)
        }
    }, [])

    const importFromProwlarr = useCallback(async () => {
        setImporting(true)
        try {
            const res = await importTrackersFromProwlarr()
            if (res.success) {
                alert(`${res.imported} tracker(s) importé(s) depuis Prowlarr`)
                await reload()
            } else {
                alert(`Erreur: ${res.error}`)
            }
        } finally {
            setImporting(false)
        }
    }, [reload])

    const debugProwlarr = useCallback(async () => {
        const res = await debugProwlarrData()
        console.log('=== PROWLARR DEBUG ===', res)
        if (res.success) {
            const hasStats = res.indexerStats && Object.keys(res.indexerStats).length > 0
            alert(
                `Debug Prowlarr :\n\n` +
                `IndexerStats: ${hasStats ? 'OUI (voir console F12)' : 'Vide ou absent'}\n` +
                `Indexers trouvés: ${res.allIndexerFields?.length || 0}\n\n` +
                `Les détails sont dans la console (F12 → Console)`
            )
        } else {
            alert(`Erreur: ${res.error}`)
        }
    }, [])

    const refreshStats = useCallback(async () => {
        setRefreshing(true)
        await reload(true)
        setRefreshing(false)
    }, [reload])

    return {
        trackers,
        stats,
        loading,
        refreshing,
        importing,
        testingId,
        reload: refreshStats,
        add,
        update,
        remove,
        test,
        importFromProwlarr,
        debugProwlarr,
    }
}
