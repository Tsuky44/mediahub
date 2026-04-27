'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

const usersQueryKey = ['activity-logs', 'users'] as const
const logsQueryKey = (page: number, filters: ActivityLogsFilters) =>
    ['activity-logs', 'list', page, filters.action, filters.userId] as const

/**
 * TanStack Query-powered activity logs hook.
 *
 * - Users dropdown fetched once and cached.
 * - Paginated logs keyed by page + filters (deduped, cached, background-refetched).
 * - Import mutation invalidates the logs list cache on success.
 */
export function useActivityLogs(): UseActivityLogsResult {
    const queryClient = useQueryClient()
    const [page, setPageState] = useState(1)
    const [filters, setFilters] = useState<ActivityLogsFilters>(INITIAL_FILTERS)

    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: usersQueryKey,
        queryFn: async () => getLogUsers() as Promise<ActivityLogUserOption[]>,
        staleTime: Infinity,
    })

    const serverFilters = {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
    }

    const { data: logsData, isLoading: logsLoading } = useQuery({
        queryKey: logsQueryKey(page, filters),
        queryFn: async () => {
            const data = await getActivityLogs(page, LOGS_PAGE_SIZE, serverFilters)
            return {
                logs: data.logs as ActivityLog[],
                total: data.total,
            }
        },
    })

    const importMutation = useMutation({
        mutationFn: importPastRequestsIntoLogs,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activity-logs', 'list'] })
        },
    })

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

    const importPastRequests = async () => {
        try {
            const res = await importMutation.mutateAsync()
            if (res.success) {
                alert(`Importation réussie. ${res.imported} anciennes demandes ont été ajoutées aux logs.`)
            } else {
                alert("Erreur lors de l'importation: " + res.error)
            }
        } catch (e) {
            console.error(e)
            alert("Erreur lors de l'importation")
        }
    }

    const total = logsData?.total ?? 0
    const totalPages = Math.ceil(total / LOGS_PAGE_SIZE)

    return {
        logs: logsData?.logs ?? [],
        users,
        total,
        loading: usersLoading || logsLoading,
        importing: importMutation.isPending,
        page,
        filters,
        totalPages,
        setPage,
        setFilter,
        importPastRequests,
    }
}
