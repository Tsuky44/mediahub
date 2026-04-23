'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Container, Layers, RefreshCw, Activity } from 'lucide-react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'

import type { DockerContainer, DockerAction } from './_types/docker'
import { useDockerContainers } from './_hooks/useDockerContainers'
import { useDockerGroups } from './_hooks/useDockerGroups'
import { useDockerViewPreferences } from './_hooks/useDockerViewPreferences'
import { useDragAutoScroll } from './_hooks/useDragAutoScroll'

import LogViewer from './_components/LogViewer'
import GroupManager from './_components/GroupManager'
import ContainerStats from './_components/ContainerStats'
import TerminalViewer from './_components/TerminalViewer'
import ContainerDetails from './_components/ContainerDetails'
import { ContainerCard, type ContainerPermissions } from './_components/container/ContainerCard'
import { DockerStatsGrid } from './_components/DockerStatsGrid'
import { DockerSearchBar } from './_components/DockerSearchBar'
import { DockerGroupSection } from './_components/DockerGroupSection'

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

    // Data + actions
    const { containers, loading, refreshing, error, actionLoading, refetch, performAction } = useDockerContainers()
    const { groups, moveContainer } = useDockerGroups()
    const { viewMode, setViewMode, collapsedGroups, toggleGroupCollapse } = useDockerViewPreferences()

    // UI state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [showLogsForContainer, setShowLogsForContainer] = useState<DockerContainer | null>(null)
    const [statsContainer, setStatsContainer] = useState<DockerContainer | null>(null)
    const [terminalContainer, setTerminalContainer] = useState<DockerContainer | null>(null)
    const [detailsContainer, setDetailsContainer] = useState<DockerContainer | null>(null)
    const [showGroupManager, setShowGroupManager] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null)

    // Drag & drop auto-scroll
    useDragAutoScroll(!!draggedContainerId)

    // Close menu on outside click
    const menuRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, containerId: string) => {
        e.dataTransfer.setData('text/plain', containerId)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedContainerId(containerId)
    }
    const handleDragEnd = () => setDraggedContainerId(null)
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }
    const handleDropOnGroup = async (e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault()
        const containerId = draggedContainerId || e.dataTransfer.getData('text/plain')
        setDraggedContainerId(null)

        if (!containerId) return
        const container = containers.find(c => c.id === containerId)
        if (!container) return

        await moveContainer(container.name, targetGroupId)
    }

    // Derived data
    const stats = {
        total: containers.length,
        running: containers.filter(c => c.state === 'RUNNING').length,
        stopped: containers.filter(c => c.state !== 'RUNNING').length,
        groups: groups.length,
    }

    const filteredContainers = containers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.image.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.ports && c.ports.includes(searchQuery))
    )

    const groupedContainers = groups.map(group => {
        const groupMemberNames = group.members.map(m => m.containerName)
        const groupContainers = filteredContainers.filter(c => groupMemberNames.includes(c.name))
        return { ...group, containers: groupContainers }
    }).filter(g => searchQuery ? g.containers.length > 0 : true)

    const ungroupedContainers = filteredContainers.filter(c =>
        !groups.some(g => g.members.some(m => m.containerName === c.name))
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
        setOpenMenuId(null)
        await performAction(containerRef, action)
    }

    const renderContainer = (container: DockerContainer) => (
        <ContainerCard
            key={container.id}
            container={container}
            viewMode={viewMode}
            permissions={permissions}
            isActionLoading={actionLoading === container.id}
            isDragged={draggedContainerId === container.id}
            isMenuOpen={openMenuId === container.id}
            onDragStart={(e) => handleDragStart(e, container.id)}
            onDragEnd={handleDragEnd}
            onSelectStats={() => setStatsContainer(container)}
            onToggleMenu={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === container.id ? null : container.id) }}
            onCloseMenu={() => setOpenMenuId(null)}
            onShowLogs={() => setShowLogsForContainer(container)}
            onShowTerminal={() => setTerminalContainer(container)}
            onShowDetails={() => setDetailsContainer(container)}
            onAction={handleAction}
        />
    )

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="p-4 bg-red-500/10 rounded-full">
                    <Activity className="w-12 h-12 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white">Accès non autorisé</h1>
                <p className="text-gray-400">Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Stats */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
                                <Container className="w-7 h-7 text-indigo-400" />
                            </div>
                            Gestion Docker
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm font-medium ml-1">Gérez et surveillez vos conteneurs Unraid en temps réel</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={refetch}
                            disabled={refreshing}
                            className="p-3 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-white/5 hover:border-white/10 transition-all active:scale-95 disabled:opacity-50"
                            title="Rafraîchir"
                        >
                            <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
                        </button>
                        {canManageGroups && (
                            <button
                                onClick={() => setShowGroupManager(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                            >
                                <Layers className="w-5 h-5" />
                                <span className="hidden sm:inline">Gérer les Groupes</span>
                            </button>
                        )}
                    </div>
                </div>

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
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Container className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-gray-500 font-medium animate-pulse">Chargement des conteneurs...</p>
                </div>
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
                            highlightDrop={!!draggedContainerId}
                            dropTone="group"
                            viewMode={viewMode}
                            containers={group.containers}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnGroup(e, group.id)}
                            renderContainer={renderContainer}
                        />
                    ))}

                    {ungroupedContainers.length > 0 && (
                        <DockerGroupSection
                            title="Autres Conteneurs"
                            subtitle="Conteneurs non groupés"
                            highlightDrop={!!draggedContainerId}
                            dropTone="ungrouped"
                            viewMode={viewMode}
                            containers={ungroupedContainers}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnGroup(e, 'ungrouped')}
                            renderContainer={renderContainer}
                        />
                    )}
                </div>
            )}

            {showLogsForContainer && (
                <LogViewer
                    containerId={showLogsForContainer.name}
                    onClose={() => setShowLogsForContainer(null)}
                    canReadDetails={canReadDetails}
                />
            )}

            {terminalContainer && (
                <TerminalViewer
                    containerId={terminalContainer.id}
                    containerName={terminalContainer.name}
                    onClose={() => setTerminalContainer(null)}
                    canManageContainers={canManageContainers}
                />
            )}

            {detailsContainer && (
                <ContainerDetails
                    containerId={detailsContainer.id}
                    containerName={detailsContainer.name}
                    onClose={() => setDetailsContainer(null)}
                    canReadDetails={canReadDetails}
                />
            )}

            {showGroupManager && (
                <GroupManager
                    groups={groups}
                    onClose={() => setShowGroupManager(false)}
                    onRefresh={() => {
                        // Groups hook handles refresh automatically when moved; this is kept for GroupManager compatibility
                    }}
                    canManage={canManageGroups}
                />
            )}

            {statsContainer && (
                <ContainerStats
                    container={statsContainer}
                    onClose={() => setStatsContainer(null)}
                    canReadDetails={canReadDetails}
                />
            )}
        </div>
    )
}
