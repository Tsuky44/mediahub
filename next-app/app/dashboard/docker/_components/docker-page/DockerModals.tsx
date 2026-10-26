'use client'

import dynamic from 'next/dynamic'

// Modales chargées à la demande : leur code (xterm, socket.io, graphiques…)
// n'alourdit plus le chargement initial de la page Docker.
const LogViewer = dynamic(() => import('../LogViewer'), { ssr: false })
const GroupManager = dynamic(() => import('../GroupManager'), { ssr: false })
const ContainerStats = dynamic(() => import('../ContainerStats'), { ssr: false })
const TerminalViewer = dynamic(() => import('../TerminalViewer'), { ssr: false })
const ContainerDetails = dynamic(() => import('../ContainerDetails'), { ssr: false })

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
