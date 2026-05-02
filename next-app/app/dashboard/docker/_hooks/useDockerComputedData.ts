'use client'

import { useMemo } from 'react'
import type { DockerContainer } from '../_types/docker'
import type { DockerGroup } from '../_types/docker'
import {
    buildGroupedContainers,
    computeDockerStats,
    filterContainers,
    getUngroupedContainers,
} from '../_utils/docker-filters'

interface UseDockerComputedDataOptions {
    containers: DockerContainer[]
    groups: DockerGroup[]
    searchQuery: string
}

export function useDockerComputedData({ containers, groups, searchQuery }: UseDockerComputedDataOptions) {
    const stats = useMemo(
        () => computeDockerStats(containers, groups),
        [containers, groups]
    )

    const filteredContainers = useMemo(
        () => filterContainers(containers, searchQuery),
        [containers, searchQuery]
    )

    const groupedContainers = useMemo(
        () => buildGroupedContainers(groups, filteredContainers, !!searchQuery),
        [groups, filteredContainers, searchQuery]
    )

    const ungroupedContainers = useMemo(
        () => getUngroupedContainers(filteredContainers, groups),
        [filteredContainers, groups]
    )

    return { stats, filteredContainers, groupedContainers, ungroupedContainers }
}
