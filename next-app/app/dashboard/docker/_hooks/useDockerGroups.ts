'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DockerGroup } from '../_types/docker'

export interface UseDockerGroupsResult {
    groups: DockerGroup[]
    refetch: () => Promise<void>
    moveContainer: (containerName: string, targetGroupId: string) => Promise<void>
}

/**
 * Charge les groupes Docker et gere le deplacement d'un conteneur vers un groupe
 * (ou 'ungrouped' pour le retirer du groupe source) avec update optimiste.
 */
export function useDockerGroups(): UseDockerGroupsResult {
    const [groups, setGroups] = useState<DockerGroup[]>([])

    const fetchGroups = useCallback(async () => {
        try {
            const res = await fetch('/api/docker/groups')
            if (res.ok) {
                const data = await res.json()
                setGroups(data.groups || [])
            }
        } catch (error) {
            console.error(error)
        }
    }, [])

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    const moveContainer = useCallback(async (containerName: string, targetGroupId: string) => {
        const sourceGroup = groups.find(g => g.members.some(m => m.containerName === containerName))

        if (sourceGroup && sourceGroup.id === targetGroupId) return
        if (!sourceGroup && targetGroupId === 'ungrouped') return

        // Optimistic update
        const optimisticGroups = groups.map(g => {
            if (sourceGroup && g.id === sourceGroup.id) {
                return { ...g, members: g.members.filter(m => m.containerName !== containerName) }
            }
            if (g.id === targetGroupId) {
                return { ...g, members: [...g.members, { containerName }] }
            }
            return g
        })
        setGroups(optimisticGroups)

        try {
            // 1. Remove from source group if applicable
            if (sourceGroup) {
                const newSourceMembers = sourceGroup.members
                    .filter(m => m.containerName !== containerName)
                    .map(m => m.containerName)
                await fetch(`/api/docker/groups/${sourceGroup.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ members: newSourceMembers }),
                })
            }

            // 2. Add to target group unless it's 'ungrouped'
            if (targetGroupId !== 'ungrouped') {
                const targetGroup = groups.find(g => g.id === targetGroupId)
                const currentMembers = targetGroup ? targetGroup.members.map(m => m.containerName) : []
                const newTargetMembers = Array.from(new Set([...currentMembers, containerName]))

                await fetch(`/api/docker/groups/${targetGroupId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ members: newTargetMembers }),
                })
            }

            // Refresh groups to ensure consistency
            await fetchGroups()
        } catch (error) {
            console.error('Error moving container', error)
            await fetchGroups() // Revert on error
        }
    }, [groups, fetchGroups])

    return {
        groups,
        refetch: fetchGroups,
        moveContainer,
    }
}
