'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSessionTrackerStats, getTrackerHistory } from '../actions'

export interface SessionTrackerStat {
    tracker: string
    uploaded: number
    downloaded: number
    count: number
}

export interface HistoryEntry {
    date: string
    stats: {
        tracker: string
        uploaded: number
        downloaded: number
    }[]
}

export type TrackerStatsTab = 'session' | 'history'

const HISTORY_DEBOUNCE_MS = 300

function defaultStartDate() {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
}

const sessionQueryKey = ['tracker-stats', 'session'] as const
const historyQueryKey = (start: string, end: string) =>
    ['tracker-stats', 'history', start, end] as const

/**
 * TanStack Query-powered tracker stats modal.
 *
 * - Session stats fetched only when modal is open and tab is 'session'.
 * - History fetched with debounced date range when modal is open and tab is 'history'.
 */
export function useTrackerStatsModal(isOpen: boolean) {
    const [activeTab, setActiveTab] = useState<TrackerStatsTab>('session')
    const [startDate, setStartDate] = useState(defaultStartDate)
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const [debouncedDates, setDebouncedDates] = useState({ start: startDate, end: endDate })

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedDates({ start: startDate, end: endDate })
        }, HISTORY_DEBOUNCE_MS)
        return () => clearTimeout(timer)
    }, [startDate, endDate])

    const { data: trackerStats = [], isLoading: loadingTrackers } = useQuery({
        queryKey: sessionQueryKey,
        queryFn: getSessionTrackerStats,
        enabled: isOpen && activeTab === 'session',
    })

    const { data: history = [], isLoading: loadingHistory } = useQuery({
        queryKey: historyQueryKey(debouncedDates.start, debouncedDates.end),
        queryFn: async () => {
            const data = await getTrackerHistory(debouncedDates.start, debouncedDates.end)
            return data as unknown as HistoryEntry[]
        },
        enabled: isOpen && activeTab === 'history',
    })

    return {
        activeTab,
        setActiveTab,
        trackerStats,
        history,
        loadingTrackers,
        loadingHistory,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
    }
}
