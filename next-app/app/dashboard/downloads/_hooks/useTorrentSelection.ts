'use client'

import { useCallback, useState } from 'react'
import { Torrent } from '@/lib/services/qbittorrent'

export interface UseTorrentSelectionResult {
    selectedTorrents: string[]
    setSelectedTorrents: React.Dispatch<React.SetStateAction<string[]>>
    toggleSelect: (hash: string) => void
    toggleSelectAll: () => void
    clearSelection: () => void
}

/**
 * Gere la selection multiple de torrents (toggle individuel, select all, clear).
 * La reference `filteredTorrents` sert a calculer "tout selectionner".
 */
export function useTorrentSelection(filteredTorrents: Torrent[]): UseTorrentSelectionResult {
    const [selectedTorrents, setSelectedTorrents] = useState<string[]>([])

    const toggleSelect = useCallback((hash: string) => {
        setSelectedTorrents(prev =>
            prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
        )
    }, [])

    const toggleSelectAll = useCallback(() => {
        setSelectedTorrents(prev =>
            prev.length === filteredTorrents.length ? [] : filteredTorrents.map(t => t.hash)
        )
    }, [filteredTorrents])

    const clearSelection = useCallback(() => {
        setSelectedTorrents([])
    }, [])

    return {
        selectedTorrents,
        setSelectedTorrents,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
    }
}
