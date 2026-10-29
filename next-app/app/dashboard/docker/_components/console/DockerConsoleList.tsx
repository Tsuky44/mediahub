'use client'

import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { ConsoleRow } from './ConsoleRow'
import type {
    DockerAction,
    DockerContainer,
    DockerDensity,
    DockerViewMode,
} from '../../_types/docker'
import type { ContainerPermissions } from '../container/container-card-types'

/**
 * Liste des conteneurs, variante console.
 *
 * Interface de props strictement identique à `DockerContainerList` : les deux
 * présentations sont interchangeables et la page n'a qu'à choisir laquelle
 * monter. Tous les hooks — données, sélection, filtres, actions — restent
 * partagés.
 *
 * `viewMode` est volontairement ignoré : la distinction grille / liste n'a pas
 * de sens dans une vue tabulaire, où la densité seule fait varier l'affichage.
 */
interface DockerConsoleListProps {
    containers: DockerContainer[]
    groupedContainers: Array<{ id: string; name: string; containers: DockerContainer[] }>
    ungroupedContainers: DockerContainer[]
    collapsedGroups: string[]
    viewMode: DockerViewMode
    density: DockerDensity
    permissions: ContainerPermissions
    actionLoading: string | null
    draggedContainerId: string | null
    isDragging: boolean
    openMenuId: string | null
    selectedIds: Set<string>
    onToggleSelect: (id: string) => void
    dragDropHandlers: {
        onDragStart: (e: React.DragEvent, id: string) => void
        onDragEnd: () => void
        onDragOver: (e: React.DragEvent) => void
        onDropOnGroup: (e: React.DragEvent, groupId: string) => void
    }
    modalHandlers: {
        openStats: (container: DockerContainer) => void
        openLogs: (container: DockerContainer) => void
        openTerminal: (container: DockerContainer) => void
        openDetails: (container: DockerContainer) => void
    }
    toggleGroupCollapse: (id: string) => void
    toggleMenu: (id: string) => void
    closeMenu: () => void
    performAction: (ref: string, action: DockerAction) => Promise<void>
}

export function DockerConsoleList({
    groupedContainers,
    ungroupedContainers,
    collapsedGroups,
    density,
    permissions,
    actionLoading,
    draggedContainerId,
    isDragging,
    selectedIds,
    onToggleSelect,
    dragDropHandlers,
    modalHandlers,
    toggleGroupCollapse,
    closeMenu,
    performAction,
}: DockerConsoleListProps) {
    const handleAction = async (containerId: string, action: DockerAction) => {
        closeMenu()
        await performAction(containerId, action)
    }

    const renderRow = (container: DockerContainer) => (
        <ConsoleRow
            key={container.id}
            container={container}
            viewMode="list"
            density={density}
            permissions={permissions}
            isActionLoading={actionLoading === container.id}
            isDragged={draggedContainerId === container.id}
            isMenuOpen={false}
            isSelected={selectedIds.has(container.id)}
            onToggleSelect={() => onToggleSelect(container.id)}
            onDragStart={(e: React.DragEvent) => dragDropHandlers.onDragStart(e, container.id)}
            onDragEnd={dragDropHandlers.onDragEnd}
            onSelectStats={() => modalHandlers.openStats(container)}
            onToggleMenu={() => {}}
            onCloseMenu={closeMenu}
            onShowLogs={() => modalHandlers.openLogs(container)}
            onShowTerminal={() => modalHandlers.openTerminal(container)}
            onShowDetails={() => modalHandlers.openDetails(container)}
            onAction={handleAction}
        />
    )

    const section = (
        key: string,
        label: string,
        containers: DockerContainer[],
        groupId: string,
        collapsible: boolean
    ) => {
        const collapsed = collapsible && collapsedGroups.includes(groupId)
        const running = containers.filter(c => c.state === 'RUNNING').length

        return (
            <section
                key={key}
                onDragOver={dragDropHandlers.onDragOver}
                onDrop={e => dragDropHandlers.onDropOnGroup(e, groupId)}
                className={clsx(
                    'border border-white/[0.05] bg-black/20',
                    isDragging && 'border-[--color-indigo-500]/30',
                )}
            >
                {/* En-tête collant : sur une longue liste, on veut savoir en
                    permanence dans quel groupe on se trouve. */}
                <header className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-[--color-gray-900] border-b border-white/[0.06] backdrop-blur-sm">
                    {collapsible ? (
                        <button
                            onClick={() => toggleGroupCollapse(groupId)}
                            className="flex items-center gap-1.5 text-[--color-gray-400] hover:text-[--color-gray-100] transition-colors"
                            aria-expanded={!collapsed}
                        >
                            <ChevronRight
                                className={clsx('w-3 h-3 transition-transform', !collapsed && 'rotate-90')}
                            />
                            <span className="font-mono text-[11px] uppercase tracking-[0.15em]">{label}</span>
                        </button>
                    ) : (
                        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[--color-gray-500] pl-[18px]">
                            {label}
                        </span>
                    )}

                    <span className="ml-auto font-mono text-[10px] tabular-nums text-[--color-gray-600]">
                        {running}/{containers.length}
                    </span>
                </header>

                {!collapsed && (
                    <div>
                        {containers.length === 0 ? (
                            <p className="px-3 py-3 font-mono text-[11px] text-[--color-gray-600]">
                                — vide —
                            </p>
                        ) : (
                            containers.map(renderRow)
                        )}
                    </div>
                )}
            </section>
        )
    }

    return (
        <div className="space-y-3">
            {groupedContainers.map(group =>
                section(group.id, group.name, group.containers, group.id, true)
            )}

            {ungroupedContainers.length > 0 &&
                section('ungrouped', 'non groupés', ungroupedContainers, 'ungrouped', false)}
        </div>
    )
}
