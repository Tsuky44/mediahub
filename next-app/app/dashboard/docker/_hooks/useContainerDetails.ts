'use client'

import { useEffect, useState } from 'react'
import type { ContainerInfo } from '../_types/container-details'

export interface UseContainerDetailsResult {
    details: ContainerInfo | null
    loading: boolean
    error: string | null
}

/**
 * Charge les details complets d'un conteneur Docker (image, env, volumes, ports, etc.)
 * depuis l'API `/api/docker/[id]/details`.
 */
export function useContainerDetails(containerId: string): UseContainerDetailsResult {
    const [details, setDetails] = useState<ContainerInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!containerId) return

        let cancelled = false
        const fetchDetails = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/docker/${containerId}/details`)
                const data = await res.json()

                if (!res.ok) {
                    const errorMsg = data.error || `Error ${res.status}`
                    const detailedMsg = res.status === 403
                        ? `${errorMsg} (Vérifiez les permissions du proxy Docker : CONTAINERS=1)`
                        : errorMsg
                    throw new Error(detailedMsg)
                }

                if (!cancelled) setDetails(data)
            } catch (err: any) {
                if (!cancelled) setError(err.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchDetails()

        return () => {
            cancelled = true
        }
    }, [containerId])

    return { details, loading, error }
}
