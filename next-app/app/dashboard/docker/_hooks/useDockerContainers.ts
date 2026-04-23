'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DockerContainer, DockerAction } from '../_types/docker'

export interface UseDockerContainersResult {
    containers: DockerContainer[]
    loading: boolean
    refreshing: boolean
    error: string | null
    actionLoading: string | null
    refetch: () => Promise<void>
    performAction: (containerId: string, action: DockerAction) => Promise<void>
}

/**
 * Charge les conteneurs Docker (`/api/unraid/docker`) avec polling toutes les 10s
 * et expose l'action start/stop/restart avec rafraichissement automatique.
 */
export function useDockerContainers(): UseDockerContainersResult {
    const [containers, setContainers] = useState<DockerContainer[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchContainers = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/unraid/docker')
            if (!res.ok) {
                if (res.status === 401) throw new Error('Non autorisé')
                throw new Error('Erreur lors de la récupération des conteneurs')
            }
            const data = await res.json()
            setContainers(data.containers || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    const refetch = useCallback(() => fetchContainers(true), [fetchContainers])

    const performAction = useCallback(async (containerId: string, action: DockerAction) => {
        setActionLoading(containerId)
        try {
            const res = await fetch('/api/unraid/docker/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ containerId, action }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Action failed')
            }

            // Wait a moment for Docker to update state
            await new Promise(resolve => setTimeout(resolve, 500))
            await fetchContainers(true)
        } catch (err: any) {
            setError(`Erreur lors de l'action ${action}: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }, [fetchContainers])

    useEffect(() => {
        fetchContainers()
        const interval = setInterval(() => fetchContainers(true), 10000)
        return () => clearInterval(interval)
    }, [fetchContainers])

    return {
        containers,
        loading,
        refreshing,
        error,
        actionLoading,
        refetch,
        performAction,
    }
}
