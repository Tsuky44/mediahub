import type { DockerContainer, DockerGroup } from '../_types/docker'

export interface DockerStats {
    total: number
    running: number
    stopped: number
    groups: number
}

export interface DockerGroupWithContainers extends DockerGroup {
    containers: DockerContainer[]
}

/**
 * Aggregate counts for the stats grid header.
 */
export function computeDockerStats(
    containers: DockerContainer[],
    groups: DockerGroup[]
): DockerStats {
    return {
        total: containers.length,
        running: containers.filter(c => c.state === 'RUNNING').length,
        stopped: containers.filter(c => c.state !== 'RUNNING').length,
        groups: groups.length,
    }
}

/**
 * Apply the search query against container name, image, and the optional
 * `ports` field (substring match for ports preserves original behavior).
 *
 * An empty / whitespace-only query returns the input verbatim.
 */
export function filterContainers(
    containers: DockerContainer[],
    searchQuery: string
): DockerContainer[] {
    const trimmed = searchQuery.toLowerCase()
    if (!trimmed) return containers
    return containers.filter(
        c =>
            c.name.toLowerCase().includes(trimmed) ||
            c.image.toLowerCase().includes(trimmed) ||
            (c.ports !== undefined && c.ports.includes(searchQuery))
    )
}

/**
 * Build the per-group container partition from already-filtered containers.
 *
 * When a search query is active, empty groups are omitted to keep the page
 * focused on relevant matches; without a query, all groups are kept (even
 * when empty), matching the original component's behavior.
 */
export function buildGroupedContainers(
    groups: DockerGroup[],
    filteredContainers: DockerContainer[],
    hasSearchQuery: boolean
): DockerGroupWithContainers[] {
    return groups
        .map(group => {
            const memberNames = group.members.map(m => m.containerName)
            const groupContainers = filteredContainers.filter(c =>
                memberNames.includes(c.name)
            )
            return { ...group, containers: groupContainers }
        })
        .filter(g => (hasSearchQuery ? g.containers.length > 0 : true))
}

/**
 * Containers that don't belong to any group (computed against the original
 * groups, not the search-trimmed list, to mirror the original behavior).
 */
export function getUngroupedContainers(
    filteredContainers: DockerContainer[],
    groups: DockerGroup[]
): DockerContainer[] {
    return filteredContainers.filter(
        c => !groups.some(g => g.members.some(m => m.containerName === c.name))
    )
}
