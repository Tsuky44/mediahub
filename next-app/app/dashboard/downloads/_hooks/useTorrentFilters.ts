'use client'

import { useMemo, useState } from 'react'
import { Torrent } from '@/lib/services/qbittorrent'
import { getTrackerName } from '../_utils/torrent-formatters'

export type TorrentSortBy =
    | 'name'
    | 'ratio'
    | 'upspeed'
    | 'dlspeed'
    | 'global_speed'
    | 'added_on'
    | 'progress'
    | 'uploaded'
    | 'size'
    | 'amount_left'
    | 'eta'
    | 'num_seeds'
    | 'num_leechs'
    | 'last_activity'
    | 'completion_on'
    | 'availability'
    | 'downloaded'
    | 'category'

export type SortOrder = 'asc' | 'desc'

export interface UseTorrentFiltersResult {
    // State
    searchQuery: string
    setSearchQuery: (value: string) => void
    selectedTags: string[]
    setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>
    selectedTrackers: string[]
    setSelectedTrackers: React.Dispatch<React.SetStateAction<string[]>>
    dateFrom: string
    setDateFrom: (value: string) => void
    sortBy: TorrentSortBy
    setSortBy: React.Dispatch<React.SetStateAction<TorrentSortBy>>
    sortOrder: SortOrder
    setSortOrder: React.Dispatch<React.SetStateAction<SortOrder>>
    // Derived
    trackers: string[]
    filteredTorrents: Torrent[]
    // Actions
    resetFilters: () => void
}

/**
 * Encapsule l'etat des filtres/tri d'une liste de torrents et calcule
 * de maniere memoisee la liste filtree + les trackers uniques disponibles.
 */
export function useTorrentFilters(torrents: Torrent[]): UseTorrentFiltersResult {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [selectedTrackers, setSelectedTrackers] = useState<string[]>([])
    const [dateFrom, setDateFrom] = useState('')
    const [sortBy, setSortBy] = useState<TorrentSortBy>('added_on')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    const trackers = useMemo(
        () => Array.from(new Set(torrents.map(t => getTrackerName(t.tracker)))).sort(),
        [torrents]
    )

    const filteredTorrents = useMemo(() => {
        if (!Array.isArray(torrents)) return []
        return torrents
            .filter(t => {
                const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesTags = selectedTags.length === 0 ||
                    (t.tags && selectedTags.every(tag => t.tags.split(',').map(st => st.trim()).includes(tag)))
                const matchesTrackers = selectedTrackers.length === 0 || selectedTrackers.includes(getTrackerName(t.tracker))
                const matchesDate = !dateFrom || (t.added_on * 1000 >= new Date(dateFrom).getTime())
                return matchesSearch && matchesTags && matchesTrackers && matchesDate
            })
            .sort((a, b) => {
                let comparison = 0
                if (sortBy === 'name') comparison = a.name.localeCompare(b.name)
                else if (sortBy === 'ratio') comparison = a.ratio - b.ratio
                else if (sortBy === 'upspeed') comparison = a.upspeed - b.upspeed
                else if (sortBy === 'dlspeed') comparison = a.dlspeed - b.dlspeed
                else if (sortBy === 'global_speed') comparison = (a.upspeed + a.dlspeed) - (b.upspeed + b.dlspeed)
                else if (sortBy === 'added_on') comparison = a.added_on - b.added_on
                else if (sortBy === 'progress') comparison = a.progress - b.progress
                else if (sortBy === 'uploaded') comparison = a.uploaded - b.uploaded
                else if (sortBy === 'size') comparison = a.size - b.size
                else if (sortBy === 'amount_left') comparison = (a.size - a.downloaded) - (b.size - b.downloaded)
                else if (sortBy === 'eta') comparison = a.eta - b.eta
                else if (sortBy === 'num_seeds') comparison = a.num_seeds - b.num_seeds
                else if (sortBy === 'num_leechs') comparison = a.num_leechs - b.num_leechs
                else if (sortBy === 'last_activity') comparison = a.last_activity - b.last_activity
                else if (sortBy === 'completion_on') comparison = a.completion_on - b.completion_on
                else if (sortBy === 'availability') comparison = a.availability - b.availability
                else if (sortBy === 'downloaded') comparison = a.downloaded - b.downloaded
                else if (sortBy === 'category') comparison = (a.category || '').localeCompare(b.category || '')

                return sortOrder === 'asc' ? comparison : -comparison
            })
    }, [torrents, searchQuery, selectedTags, selectedTrackers, dateFrom, sortBy, sortOrder])

    const resetFilters = () => {
        setSelectedTags([])
        setSelectedTrackers([])
        setDateFrom('')
        setSortBy('added_on')
    }

    return {
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        selectedTrackers,
        setSelectedTrackers,
        dateFrom,
        setDateFrom,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        trackers,
        filteredTorrents,
        resetFilters,
    }
}
