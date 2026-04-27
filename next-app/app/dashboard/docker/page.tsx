'use client'

import { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { useAbility } from '@casl/react'

import { AbilityContext } from '@/components/providers/AbilityContext'

import type { DockerContainer, DockerAction } from './_types/docker'
import { useDockerContainers } from './_hooks/useDockerContainers'
import { useDockerGroups } from './_hooks/useDockerGroups'
import { useDockerViewPreferences } from './_hooks/useDockerViewPreferences'
import { useDockerOpenMenu } from './_hooks/useDockerOpenMenu'
import { useDockerDragDrop } from './_hooks/useDockerDragDrop'
import { useDockerModals } from './_hooks/useDockerModals'
import {
    buildGroupedContainers,
    computeDockerStats,
    filterContainers,
    getUngroupedContainers,
} from './_utils/docker-filters'

import { ContainerCard, type ContainerPermissions } from './_components/container/ContainerCard'
import { DockerStatsGrid } from './_components/DockerStatsGrid'
import { DockerSearchBar } from './_components/DockerSearchBar'
import { DockerGroupSection } from './_components/DockerGroupSection'
import DockerPageHeader from './_components/docker-page/DockerPageHeader'
import DockerLoadingState from './_components/docker-page/DockerLoadingState'
import DockerAccessDeniedView from './_components/docker-page/DockerAccessDeniedView'
import DockerModals from './_components/docker-page/DockerModals'

export default function DockerPage() {
    const ability = useAbility(AbilityContext)

    const canView = ability.can('read', 'Docker')
    const canReadDetails = ability.can('read_details', 'Docker')
    const canReadLogs = ability.can('read_logs', 'Docker')
    const canReadStats = ability.can('read_stats', 'Docker')
    const canManageState = ability.can('manage_state', 'Docker')
    const canAccessConsole = ability.can('access_console', 'Docker')
    const canManageGroups = ability.can('manage_groups', 'Docker')
    const canManageContainers = canManageState

    const { containers, loading, refreshing, error, actionLoading, refetch, performAction } =
        useDockerContainers()
    const { groups, moveContainer } = useDockerGroups()
    const { viewMode, setViewMode, collapsedGroups, toggleGroupCollapse } =
        useDockerViewPreferences()

    const { openMenuId, toggleMenu, closeMenu, menuRef } = useDockerOpenMenu()
    const dragDrop = useDockerDragDrop({ containers, moveContainer })
    const modals = useDockerModals()

    const [searchQuery, setSearchQuery] = useState('')

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

    const permissions: ContainerPermissions = {
        canManageContainers,
        canAccessConsole,
        canReadDetails,
        canReadLogs,
        canReadStats,
        canManageGroups,
    }

    const handleAction = async (containerRef: string, action: DockerAction) => {
        closeMenu()
        await performAction(containerRef, action)
    }

    const renderContainer = (container: DockerContainer) => (
        <ContainerCard
            key={container.id}
            container={container}
            viewMode={viewMode}
            permissions={permissions}
            isActionLoading={actionLoading === container.id}
            isDragged={dragDrop.draggedContainerId === container.id}
            isMenuOpen={openMenuId === container.id}
            onDragStart={e => dragDrop.onDragStart(e, container.id)}
            onDragEnd={dragDrop.onDragEnd}
            onSelectStats={() => modals.openStats(container)}
            onToggleMenu={e => {
                e.stopPropagation()
                toggleMenu(container.id)
            }}
            onCloseMenu={closeMenu}
            onShowLogs={() => modals.openLogs(container)}
            onShowTerminal={() => modals.openTerminal(container)}
            onShowDetails={() => modals.openDetails(container)}
            onAction={handleAction}
        />
    )

    if (!canView) {
        return <DockerAccessDeniedView />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500" ref={menuRef}>
            <div className="space-y-6">
                <DockerPageHeader
                    refreshing={refreshing}
                    canManageGroups={canManageGroups}
                    onRefresh={refetch}
                    onOpenGroupManager={modals.openGroupManager}
                />

                <DockerStatsGrid {...stats} />

                <DockerSearchBar
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Activity className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {loading && !refreshing ? (
                <DockerLoadingState />
            ) : (
                <div className="space-y-10">
                    {groupedContainers.map(group => (
                        <DockerGroupSection
                            key={group.id}
                            title={group.name}
                            subtitle="Conteneurs groupés"
                            badgeCount={group.containers.length}
                            collapsible
                            collapsed={collapsedGroups.includes(group.id)}
                            onToggleCollapse={() => toggleGroupCollapse(group.id)}
                            highlightDrop={dragDrop.isDragging}
                            dropTone="group"
                            viewMode={viewMode}
                            containers={group.containers}
                            onDragOver={dragDrop.onDragOver}
                            onDrop={e => dragDrop.onDropOnGroup(e, group.id)}
                            renderContainer={renderContainer}
                        />
                    ))}

                    {ungroupedContainers.length > 0 && (
                        <DockerGroupSection
                            title="Autres Conteneurs"
                            subtitle="Conteneurs non groupés"
                            highlightDrop={dragDrop.isDragging}
                            dropTone="ungrouped"
                            viewMode={viewMode}
                            containers={ungroupedContainers}
                            onDragOver={dragDrop.onDragOver}
                            onDrop={e => dragDrop.onDropOnGroup(e, 'ungrouped')}
                            renderContainer={renderContainer}
                        />
                    )}
                </div>
            )}

            <DockerModals
                logsContainer={modals.logsContainer}
                statsContainer={modals.statsContainer}
                terminalContainer={modals.terminalContainer}
                detailsContainer={modals.detailsContainer}
                showGroupManager={modals.showGroupManager}
                groups={groups}
                canReadDetails={canReadDetails}
                canManageContainers={canManageContainers}
                canManageGroups={canManageGroups}
                onCloseLogs={modals.closeLogs}
                onCloseStats={modals.closeStats}
                onCloseTerminal={modals.closeTerminal}
                onCloseDetails={modals.closeDetails}
                onCloseGroupManager={modals.closeGroupManager}
            />
        </div>
    )
}
