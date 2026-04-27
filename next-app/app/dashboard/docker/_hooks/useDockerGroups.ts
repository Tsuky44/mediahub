'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { DockerGroup } from '../_types/docker'

const QUERY_KEY = ['docker', 'groups'] as const

interface GroupsApiResponse {
    groups: DockerGroup[]
}

interface MoveContainerPayload {
    containerName: string
    targetGroupId: string
}

async function fetchGroups(): Promise<DockerGroup[]> {
    const data = await api.get<GroupsApiResponse>('/api/docker/groups')
    return data.groups ?? []
}

export interface UseDockerGroupsResult {
    groups: DockerGroup[]
    isLoading: boolean
    refetch: () => Promise<void>
    moveContainer: (containerName: string, targetGroupId: string) => Promise<void>
}

/**
 * TanStack Query-powered Docker groups hook.
 * Move container invalidates both groups and containers queries on success.
 */
export function useDockerGroups(): UseDockerGroupsResult {
    const queryClient = useQueryClient()

    const {
        data: groups = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchGroups,
    })

    const moveMutation = useMutation({
        mutationFn: async ({ containerName, targetGroupId }: MoveContainerPayload) => {
            const sourceGroup = groups.find(g =>
                g.members.some(m => m.containerName === containerName)
            )

            if (sourceGroup && sourceGroup.id === targetGroupId) return
            if (!sourceGroup && targetGroupId === 'ungrouped') return

            // 1. Remove from source group if applicable
            if (sourceGroup) {
                const newSourceMembers = sourceGroup.members
                    .filter(m => m.containerName !== containerName)
                    .map(m => m.containerName)
                await api.put(`/api/docker/groups/${sourceGroup.id}`, { members: newSourceMembers })
            }

            // 2. Add to target group unless it's 'ungrouped'
            if (targetGroupId !== 'ungrouped') {
                const targetGroup = groups.find(g => g.id === targetGroupId)
                const currentMembers = targetGroup
                    ? targetGroup.members.map(m => m.containerName)
                    : []
                const newTargetMembers = Array.from(new Set([...currentMembers, containerName]))

                await api.put(`/api/docker/groups/${targetGroupId}`, { members: newTargetMembers })
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
            await queryClient.invalidateQueries({ queryKey: ['docker', 'containers'] })
        },
        onError: async () => {
            // Revert by refetching
            await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        },
    })

    const moveContainer = async (containerName: string, targetGroupId: string) => {
        await moveMutation.mutateAsync({ containerName, targetGroupId })
    }

    return {
        groups,
        isLoading,
        refetch: async () => {
            await refetch()
        },
        moveContainer,
    }
}
