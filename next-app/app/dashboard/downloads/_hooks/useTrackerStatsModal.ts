'use client'

import { useEffect, useState } from 'react'
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

/**
 * Charge les stats par tracker (session et historique) lorsque la modal est ouverte,
 * avec debounce sur les changements de dates.
 */
export function useTrackerStatsModal(isOpen: boolean) {
    const [activeTab, setActiveTab] = useState<TrackerStatsTab>('session')
    const [trackerStats, setTrackerStats] = useState<SessionTrackerStat[]>([])
    const [history, setHistory] = useState<HistoryEntry[]>([])
    const [loadingTrackers, setLoadingTrackers] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [startDate, setStartDate] = useState(defaultStartDate)
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (!isOpen || activeTab !== 'session') return
        const fetchSession = async () => {
            setLoadingTrackers(true)
            try {
                const data = await getSessionTrackerStats()
                setTrackerStats(data)
            } catch (e) {
                console.error(e)
            }
            setLoadingTrackers(false)
        }
        fetchSession()
    }, [isOpen, activeTab])

    useEffect(() => {
        if (!isOpen || activeTab !== 'history') return
        const fetchHistoryData = async () => {
            setLoadingHistory(true)
            try {
                const data = await getTrackerHistory(startDate, endDate)
                setHistory(data as unknown as HistoryEntry[])
            } catch (e) {
                console.error(e)
            }
            setLoadingHistory(false)
        }
        const timer = setTimeout(fetchHistoryData, HISTORY_DEBOUNCE_MS)
        return () => clearTimeout(timer)
    }, [isOpen, activeTab, startDate, endDate])

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
