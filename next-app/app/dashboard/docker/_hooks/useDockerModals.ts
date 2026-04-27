'use client'

import { useState } from 'react'

import type { DockerContainer } from '../_types/docker'

interface UseDockerModalsResult {
    logsContainer: DockerContainer | null
    statsContainer: DockerContainer | null
    terminalContainer: DockerContainer | null
    detailsContainer: DockerContainer | null
    showGroupManager: boolean
    openLogs: (container: DockerContainer) => void
    openStats: (container: DockerContainer) => void
    openTerminal: (container: DockerContainer) => void
    openDetails: (container: DockerContainer) => void
    openGroupManager: () => void
    closeLogs: () => void
    closeStats: () => void
    closeTerminal: () => void
    closeDetails: () => void
    closeGroupManager: () => void
}

/**
 * Owns the open/close state of the five Docker page modals (logs, stats,
 * terminal, container details, group manager). Each modal target is kept
 * separate so that opening one does not close another, preserving the
 * original component's behavior.
 */
export function useDockerModals(): UseDockerModalsResult {
    const [logsContainer, setLogsContainer] = useState<DockerContainer | null>(null)
    const [statsContainer, setStatsContainer] = useState<DockerContainer | null>(null)
    const [terminalContainer, setTerminalContainer] = useState<DockerContainer | null>(null)
    const [detailsContainer, setDetailsContainer] = useState<DockerContainer | null>(null)
    const [showGroupManager, setShowGroupManager] = useState(false)

    return {
        logsContainer,
        statsContainer,
        terminalContainer,
        detailsContainer,
        showGroupManager,
        openLogs: setLogsContainer,
        openStats: setStatsContainer,
        openTerminal: setTerminalContainer,
        openDetails: setDetailsContainer,
        openGroupManager: () => setShowGroupManager(true),
        closeLogs: () => setLogsContainer(null),
        closeStats: () => setStatsContainer(null),
        closeTerminal: () => setTerminalContainer(null),
        closeDetails: () => setDetailsContainer(null),
        closeGroupManager: () => setShowGroupManager(false),
    }
}
