'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api-client'
import type { DockerContainer, DockerAction } from '../_types/docker'

const QUERY_KEY = ['docker', 'containers'] as const

interface ContainersApiResponse {
    containers: DockerContainer[]
}

interface ActionPayload {
    containerId: string
    action: DockerAction
}

async function fetchContainers(): Promise<DockerContainer[]> {
    const data = await api.get<ContainersApiResponse>('/api/unraid/docker')
    return data.containers ?? []
}

async function performContainerAction({ containerId, action }: ActionPayload): Promise<void> {
    await api.post('/api/unraid/docker/action', { containerId, action })
    // Small delay to let Docker update state server-side
    await new Promise(resolve => setTimeout(resolve, 500))
}

export interface UseDockerContainersResult {
    containers: DockerContainer[]
    isLoading: boolean
    isFetching: boolean
    error: string | null
    actionLoading: string | null
    refetch: () => Promise<void>
    performAction: (containerId: string, action: DockerAction) => Promise<void>
}

/**
 * TanStack Query-powered Docker containers hook.
 * Polling every 10s via refetchInterval.
 * performAction invalidates the container cache on success.
 */
export function useDockerContainers(): UseDockerContainersResult {
    const queryClient = useQueryClient()

    const {
        data: containers = [],
        isLoading,
        isFetching,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchContainers,
        refetchInterval: 10000,
    })

    const mutation = useMutation({
        mutationFn: performContainerAction,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const errorMessage =
        queryError instanceof ApiError
            ? queryError.message
            : queryError instanceof Error
              ? queryError.message
              : null

    const performAction = async (containerId: string, action: DockerAction) => {
        await mutation.mutateAsync({ containerId, action })
    }

    return {
        containers,
        isLoading,
        isFetching,
        error: errorMessage,
        actionLoading: mutation.isPending ? mutation.variables?.containerId ?? null : null,
        refetch: async () => {
            await refetch()
        },
        performAction,
    }
}
