'use client'

import LogViewer from '../LogViewer'
import GroupManager from '../GroupManager'
import ContainerStats from '../ContainerStats'
import TerminalViewer from '../TerminalViewer'
import ContainerDetails from '../ContainerDetails'

import type { DockerContainer, DockerGroup } from '../../_types/docker'

interface DockerModalsProps {
    logsContainer: DockerContainer | null
    statsContainer: DockerContainer | null
    terminalContainer: DockerContainer | null
    detailsContainer: DockerContainer | null
    showGroupManager: boolean
    groups: DockerGroup[]
    canReadDetails: boolean
    canManageContainers: boolean
    canManageGroups: boolean
    onCloseLogs: () => void
    onCloseStats: () => void
    onCloseTerminal: () => void
    onCloseDetails: () => void
    onCloseGroupManager: () => void
}

/**
 * Dispatcher for the five Docker page modals. Each modal renders only when
 * its target is non-null and is fully owned by the orchestrator's
 * `useDockerModals` hook.
 */
export default function DockerModals({
    logsContainer,
    statsContainer,
    terminalContainer,
    detailsContainer,
    showGroupManager,
    groups,
    canReadDetails,
    canManageContainers,
    canManageGroups,
    onCloseLogs,
    onCloseStats,
    onCloseTerminal,
    onCloseDetails,
    onCloseGroupManager,
}: DockerModalsProps) {
    return (
        <>
            {logsContainer && (
                <LogViewer
                    containerId={logsContainer.name}
                    onClose={onCloseLogs}
                    canReadDetails={canReadDetails}
                />
            )}

            {terminalContainer && (
                <TerminalViewer
                    containerId={terminalContainer.id}
                    containerName={terminalContainer.name}
                    onClose={onCloseTerminal}
                    canManageContainers={canManageContainers}
                />
            )}

            {detailsContainer && (
                <ContainerDetails
                    containerId={detailsContainer.id}
                    containerName={detailsContainer.name}
                    onClose={onCloseDetails}
                    canReadDetails={canReadDetails}
                />
            )}

            {showGroupManager && (
                <GroupManager
                    groups={groups}
                    onClose={onCloseGroupManager}
                    onRefresh={() => {
                        // Groups hook handles refresh automatically when moved;
                        // this stub is kept for GroupManager compatibility.
                    }}
                    canManage={canManageGroups}
                />
            )}

            {statsContainer && (
                <ContainerStats
                    container={statsContainer}
                    onClose={onCloseStats}
                    canReadDetails={canReadDetails}
                />
            )}
        </>
    )
}
