'use client'

import { useEffect, useState } from 'react'

export type VisibleColumns = Record<string, boolean>

const STORAGE_KEY = 'torrent_visible_columns'

const DEFAULT_COLUMNS: VisibleColumns = {
    tracker: true,
    tags: true,
    added_on: true,
    status: true,
    download_info: true,
    upload_info: true,
    peers: true,
    ratio: true,
    eta: true,
    progress_text: true,
    progress_bar: true,
    category: false,
    availability: false,
    last_activity: false,
    completion_on: false
}

/**
 * Manages the persisted set of visible columns for the torrent list.
 * State is synchronised with localStorage under the key `torrent_visible_columns`.
 * Extracted from TorrentManager.tsx during the Phase 5.1 refactor.
 */
export function useVisibleColumns() {
    const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(DEFAULT_COLUMNS)

    // Load columns from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setVisibleColumns(prev => ({ ...prev, ...JSON.parse(saved) }))
            } catch (e) {
                console.error('Failed to parse visible columns', e)
            }
        }
    }, [])

    // Toggle a column visibility and persist the new state
    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev, [key]: !prev[key] }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }

    return { visibleColumns, toggleColumn }
}
