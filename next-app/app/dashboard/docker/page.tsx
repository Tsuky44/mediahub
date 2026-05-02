'use client'

import { useState } from 'react'

import { useDockerContainers } from './_hooks/useDockerContainers'
import { useDockerGroups } from './_hooks/useDockerGroups'
import { useDockerViewPreferences } from './_hooks/useDockerViewPreferences'
import { useDockerOpenMenu } from './_hooks/useDockerOpenMenu'
import { useDockerDragDrop } from './_hooks/useDockerDragDrop'
import { useDockerModals } from './_hooks/useDockerModals'
import { useDockerPermissions } from './_hooks/useDockerPermissions'
import { useDockerComputedData } from './_hooks/useDockerComputedData'

import { DockerStatsGrid } from './_components/DockerStatsGrid'
import { DockerSearchBar } from './_components/DockerSearchBar'
import DockerPageHeader from './_components/docker-page/DockerPageHeader'
import DockerLoadingState from './_components/docker-page/DockerLoadingState'
import DockerAccessDeniedView from './_components/docker-page/DockerAccessDeniedView'
import DockerModals from './_components/docker-page/DockerModals'
import { DockerContainerList } from './_components/docker-page/DockerContainerList'
import { DockerErrorBanner } from './_components/docker-page/DockerErrorBanner'

export default function DockerPage() {
    const {
        canView,
        canReadDetails,
        canReadLogs,
        canReadStats,
        canAccessConsole,
        canManageGroups,
        canManageState,
    } = useDockerPermissions()
    const canManageContainers = canManageState

    const { containers, isLoading, isFetching, error, actionLoading, refetch, performAction } =
        useDockerContainers()
    const { groups, moveContainer } = useDockerGroups()
    const { viewMode, setViewMode, collapsedGroups, toggleGroupCollapse } =
        useDockerViewPreferences()

    const { openMenuId, toggleMenu, closeMenu, menuRef } = useDockerOpenMenu()
    const dragDrop = useDockerDragDrop({ containers, moveContainer })
    const modals = useDockerModals()

    const [searchQuery, setSearchQuery] = useState('')

    const { stats, filteredContainers, groupedContainers, ungroupedContainers } = useDockerComputedData({
        containers,
        groups,
        searchQuery,
    })

    if (!canView) {
        return <DockerAccessDeniedView />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500" ref={menuRef}>
            <div className="space-y-6">
                <DockerPageHeader
                    refreshing={isFetching}
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

            {error && <DockerErrorBanner error={error} />}

            {isLoading && !isFetching ? (
                <DockerLoadingState />
            ) : (
                <DockerContainerList
                    containers={filteredContainers}
                    groupedContainers={groupedContainers}
                    ungroupedContainers={ungroupedContainers}
                    collapsedGroups={collapsedGroups}
                    viewMode={viewMode}
                    permissions={{
                        canManageContainers,
                        canAccessConsole,
                        canReadDetails,
                        canReadLogs,
                        canReadStats,
                        canManageGroups,
                    }}
                    actionLoading={actionLoading}
                    draggedContainerId={dragDrop.draggedContainerId}
                    isDragging={dragDrop.isDragging}
                    openMenuId={openMenuId}
                    dragDropHandlers={{
                        onDragStart: dragDrop.onDragStart,
                        onDragEnd: dragDrop.onDragEnd,
                        onDragOver: dragDrop.onDragOver,
                        onDropOnGroup: dragDrop.onDropOnGroup,
                    }}
                    modalHandlers={{
                        openStats: modals.openStats,
                        openLogs: modals.openLogs,
                        openTerminal: modals.openTerminal,
                        openDetails: modals.openDetails,
                    }}
                    toggleGroupCollapse={toggleGroupCollapse}
                    toggleMenu={toggleMenu}
                    closeMenu={closeMenu}
                    performAction={performAction}
                />
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
