'use client'

import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
    downloadTorrent,
    downloadMediaRelease,
} from '@/app/dashboard/media/[id]/prowlarr-actions'
import type { ProwlarrRelease } from './prowlarr-types'

export interface DownloadResult {
    success?: boolean
    error?: string
    message?: string
}

interface DownloadContext {
    mediaType?: 'movie' | 'tv'
    tmdbId?: number
    tvdbId?: number
    selectedSeason: number | null
    selectedEpisode: number | null
}

export interface UseProwlarrDownloadResult {
    downloading: string | null
    downloadSuccess: string | null
    bulkDownloading: boolean
    selectedGuids: Set<string>
    setSelectedGuids: React.Dispatch<React.SetStateAction<Set<string>>>
    toggleSelect: (guid: string) => void
    toggleSelectAll: (allGuids: string[]) => void
    download: (release: ProwlarrRelease, ctx: DownloadContext) => Promise<void>
    bulkDownload: (releases: ProwlarrRelease[], ctx: DownloadContext) => Promise<void>
}

async function performDownload(release: ProwlarrRelease, ctx: DownloadContext): Promise<DownloadResult> {
    const { mediaType, tmdbId, tvdbId, selectedSeason, selectedEpisode } = ctx
    const url = release.downloadUrl || release.magnetUrl

    if (mediaType && tmdbId && release.indexerId) {
        const releaseInfo = {
            title: release.title,
            downloadUrl: url || '',
            protocol: release.protocol || '',
            publishDate: release.publishDate,
            indexer: release.indexer,
            size: release.size,
            guid: release.guid,
        }
        return downloadMediaRelease(
            release.guid, release.indexerId, mediaType, tmdbId, tvdbId,
            selectedSeason ?? undefined, selectedEpisode ?? undefined, releaseInfo,
        )
    }

    if (!url) return { error: 'URL de téléchargement manquante' }
    return downloadTorrent(url)
}

/**
 * Gere les telechargements unitaires et en masse depuis Prowlarr,
 * ainsi que l'etat de selection multi-torrent.
 * La mutation unitaire utilise useMutation pour beneficier du suivi TQ.
 */
export function useProwlarrDownload(): UseProwlarrDownloadResult {
    const [downloading, setDownloading] = useState<string | null>(null)
    const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
    const [bulkDownloading, setBulkDownloading] = useState(false)
    const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set())

    const downloadMutation = useMutation({
        mutationFn: async ({ release, ctx }: { release: ProwlarrRelease; ctx: DownloadContext }) => {
            const res: DownloadResult = await performDownload(release, ctx)
            const errorMsg = res.error || (res.success === false ? res.message : null)
            if (errorMsg) throw new Error(errorMsg)
            return release.guid
        },
    })

    const toggleSelect = useCallback((guid: string) => {
        setSelectedGuids(prev => {
            const next = new Set(prev)
            if (next.has(guid)) next.delete(guid)
            else next.add(guid)
            return next
        })
    }, [])

    const toggleSelectAll = useCallback((allGuids: string[]) => {
        setSelectedGuids(prev => (prev.size === allGuids.length ? new Set() : new Set(allGuids)))
    }, [])

    const download = useCallback(async (release: ProwlarrRelease, ctx: DownloadContext) => {
        setDownloading(release.guid)
        try {
            await downloadMutation.mutateAsync({ release, ctx })
            setDownloadSuccess(release.guid)
            setTimeout(() => setDownloadSuccess(null), 3000)
        } catch (err: unknown) {
            alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur lors du téléchargement'}`)
        } finally {
            setDownloading(null)
        }
    }, [downloadMutation])

    const bulkDownload = useCallback(async (releases: ProwlarrRelease[], ctx: DownloadContext) => {
        if (releases.length === 0) return
        setBulkDownloading(true)
        let successCount = 0
        let failCount = 0
        for (const release of releases) {
            try {
                await downloadMutation.mutateAsync({ release, ctx })
                successCount++
                setDownloadSuccess(release.guid)
            } catch {
                failCount++
            }
        }
        setBulkDownloading(false)
        setSelectedGuids(new Set())
        if (failCount > 0) {
            alert(`${successCount} torrents ajoutés, ${failCount} échecs.`)
        } else {
            setTimeout(() => setDownloadSuccess(null), 3000)
        }
    }, [downloadMutation])

    return {
        downloading, downloadSuccess, bulkDownloading,
        selectedGuids, setSelectedGuids,
        toggleSelect, toggleSelectAll,
        download, bulkDownload,
    }
}
