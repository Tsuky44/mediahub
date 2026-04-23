'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    getTorrents,
    addTorrent,
    deleteTorrents,
    pauseTorrents,
    resumeTorrents,
    getTags,
    setPriority,
    reannounceTorrents,
    setShareLimits,
} from '../actions'
import { Torrent } from '@/lib/services/qbittorrent'

export type TorrentPriority = 'top' | 'up' | 'down' | 'bottom'

export interface UseTorrentsResult {
    torrents: Torrent[]
    loading: boolean
    tags: string[]
    refetch: () => Promise<void>
    addTorrent: (formData: FormData) => Promise<{ success: boolean; error?: string }>
    deleteTorrents: (hashes: string[], deleteFiles: boolean) => Promise<{ success: boolean; error?: string }>
    pauseTorrents: (hashes: string[]) => Promise<void>
    resumeTorrents: (hashes: string[]) => Promise<void>
    reannounceTorrents: (hashes: string[]) => Promise<void>
    setPriority: (hashes: string[], priority: TorrentPriority) => Promise<void>
    setShareLimits: (hashes: string[], ratio: number, minutes: number, inactive: number) => Promise<void>
}

/**
 * Gere le chargement des torrents (+ polling), le fetch des tags,
 * et expose les server actions en les "re-fetchant" automatiquement au succes.
 */
export function useTorrents(filter: string, refreshInterval: number = 2000): UseTorrentsResult {
    const [torrents, setTorrents] = useState<Torrent[]>([])
    const [loading, setLoading] = useState(true)
    const [tags, setTags] = useState<string[]>([])

    const fetchTorrents = useCallback(async () => {
        const data = await getTorrents(filter)
        setTorrents(data)
        setLoading(false)
    }, [filter])

    useEffect(() => {
        fetchTorrents()
        const interval = setInterval(fetchTorrents, refreshInterval)

        const fetchMetadata = async () => {
            const tgs = await getTags()
            setTags(tgs)
        }
        fetchMetadata()

        return () => clearInterval(interval)
    }, [fetchTorrents, refreshInterval])

    const addTorrentAction = useCallback(async (formData: FormData) => {
        const res = await addTorrent(formData)
        if (res.success) await fetchTorrents()
        return res
    }, [fetchTorrents])

    const deleteTorrentsAction = useCallback(async (hashes: string[], deleteFiles: boolean) => {
        const res = await deleteTorrents(hashes, deleteFiles)
        if (res.success) await fetchTorrents()
        return res
    }, [fetchTorrents])

    const pauseTorrentsAction = useCallback(async (hashes: string[]) => {
        await pauseTorrents(hashes)
        await fetchTorrents()
    }, [fetchTorrents])

    const resumeTorrentsAction = useCallback(async (hashes: string[]) => {
        await resumeTorrents(hashes)
        await fetchTorrents()
    }, [fetchTorrents])

    const reannounceTorrentsAction = useCallback(async (hashes: string[]) => {
        await reannounceTorrents(hashes)
        await fetchTorrents()
    }, [fetchTorrents])

    const setPriorityAction = useCallback(async (hashes: string[], priority: TorrentPriority) => {
        await setPriority(hashes, priority)
        await fetchTorrents()
    }, [fetchTorrents])

    const setShareLimitsAction = useCallback(async (hashes: string[], ratio: number, minutes: number, inactive: number) => {
        await setShareLimits(hashes, ratio, minutes, inactive)
        await fetchTorrents()
    }, [fetchTorrents])

    return {
        torrents,
        loading,
        tags,
        refetch: fetchTorrents,
        addTorrent: addTorrentAction,
        deleteTorrents: deleteTorrentsAction,
        pauseTorrents: pauseTorrentsAction,
        resumeTorrents: resumeTorrentsAction,
        reannounceTorrents: reannounceTorrentsAction,
        setPriority: setPriorityAction,
        setShareLimits: setShareLimitsAction,
    }
}
