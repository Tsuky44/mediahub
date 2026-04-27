'use client'

import { useCallback, useEffect, useState } from 'react'

import {
    getActivityLogs,
    getLogUsers,
    importPastRequestsIntoLogs,
} from '../activity-actions'
import { LOGS_PAGE_SIZE } from '../_constants/activity-logs'
import type {
    ActivityLog,
    ActivityLogUserOption,
    ActivityLogsFilters,
} from '../_types/activity-logs'

interface UseActivityLogsResult {
    logs: ActivityLog[]
    users: ActivityLogUserOption[]
    total: number
    loading: boolean
    importing: boolean
    page: number
    filters: ActivityLogsFilters
    totalPages: number
    setPage: (updater: (prev: number) => number) => void
    setFilter: <K extends keyof ActivityLogsFilters>(key: K, value: ActivityLogsFilters[K]) => void
    importPastRequests: () => Promise<void>
}

const INITIAL_FILTERS: ActivityLogsFilters = { action: '', userId: '' }

/**
 * Owns the activity logs feature state: users dropdown, paginated logs,
 * filters, and the "import past requests" admin action. Side effects:
 *
 * - Loads the users dropdown once on mount.
 * - Re-fetches the logs page whenever page / filters change.
 * - After a successful import, re-loads the current page.
 */
export function useActivityLogs(): UseActivityLogsResult {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [users, setUsers] = useState<ActivityLogUserOption[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [importing, setImporting] = useState(false)
    const [page, setPageState] = useState(1)
    const [filters, setFilters] = useState<ActivityLogsFilters>(INITIAL_FILTERS)

    const loadLogs = useCallback(async () => {
        setLoading(true)
        try {
            const serverFilters: { action?: string; userId?: string } = {}
            if (filters.action) serverFilters.action = filters.action
            if (filters.userId) serverFilters.userId = filters.userId

            const data = await getActivityLogs(page, LOGS_PAGE_SIZE, serverFilters)
            setLogs(data.logs as ActivityLog[])
            setTotal(data.total)
        } catch (error) {
            console.error('Failed to load logs', error)
        } finally {
            setLoading(false)
        }
    }, [page, filters.action, filters.userId])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const data = await getLogUsers()
                if (!cancelled) setUsers(data as ActivityLogUserOption[])
            } catch (error) {
                console.error('Failed to load users', error)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        loadLogs()
    }, [loadLogs])

    const setFilter = useCallback(
        <K extends keyof ActivityLogsFilters>(key: K, value: ActivityLogsFilters[K]) => {
            setFilters(prev => ({ ...prev, [key]: value }))
            setPageState(1)
        },
        []
    )

    const setPage = useCallback((updater: (prev: number) => number) => {
        setPageState(prev => updater(prev))
    }, [])

    const importPastRequests = useCallback(async () => {
        try {
            setImporting(true)
            const res = await importPastRequestsIntoLogs()
            if (res.success) {
                alert(`Importation réussie. ${res.imported} anciennes demandes ont été ajoutées aux logs.`)
                await loadLogs()
            } else {
                alert("Erreur lors de l'importation: " + res.error)
            }
        } catch (e) {
            console.error(e)
            alert("Erreur lors de l'importation")
        } finally {
            setImporting(false)
        }
    }, [loadLogs])

    const totalPages = Math.ceil(total / LOGS_PAGE_SIZE)

    return {
        logs,
        users,
        total,
        loading,
        importing,
        page,
        filters,
        totalPages,
        setPage,
        setFilter,
        importPastRequests,
    }
}
