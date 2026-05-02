'use client'

import type { DockerContainer, DockerAction, DockerViewMode } from '../../_types/docker'
import type { ContainerPermissions } from '../../_components/container/ContainerCard'
import { ContainerCard } from '../../_components/container/ContainerCard'
import { DockerGroupSection } from '../../_components/DockerGroupSection'

interface DockerContainerListProps {
  containers: DockerContainer[]
  groupedContainers: Array<{ id: string; name: string; containers: DockerContainer[] }>
  ungroupedContainers: DockerContainer[]
  collapsedGroups: string[]
  viewMode: DockerViewMode
  permissions: ContainerPermissions
  actionLoading: string | null
  draggedContainerId: string | null
  isDragging: boolean
  openMenuId: string | null
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

export function DockerContainerList({
  groupedContainers,
  ungroupedContainers,
  collapsedGroups,
  viewMode,
  permissions,
  actionLoading,
  draggedContainerId,
  isDragging,
  openMenuId,
  dragDropHandlers,
  modalHandlers,
  toggleGroupCollapse,
  toggleMenu,
  closeMenu,
  performAction,
}: DockerContainerListProps) {
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
      isDragged={draggedContainerId === container.id}
      isMenuOpen={openMenuId === container.id}
      onDragStart={(e: React.DragEvent) => dragDropHandlers.onDragStart(e, container.id)}
      onDragEnd={dragDropHandlers.onDragEnd}
      onSelectStats={() => modalHandlers.openStats(container)}
      onToggleMenu={(e: React.MouseEvent) => {
        e.stopPropagation()
        toggleMenu(container.id)
      }}
      onCloseMenu={closeMenu}
      onShowLogs={() => modalHandlers.openLogs(container)}
      onShowTerminal={() => modalHandlers.openTerminal(container)}
      onShowDetails={() => modalHandlers.openDetails(container)}
      onAction={handleAction}
    />
  )

  return (
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
          highlightDrop={isDragging}
          dropTone="group"
          viewMode={viewMode}
          containers={group.containers}
          onDragOver={dragDropHandlers.onDragOver}
          onDrop={e => dragDropHandlers.onDropOnGroup(e, group.id)}
          renderContainer={renderContainer}
        />
      ))}

      {ungroupedContainers.length > 0 && (
        <DockerGroupSection
          title="Autres Conteneurs"
          subtitle="Conteneurs non groupés"
          highlightDrop={isDragging}
          dropTone="ungrouped"
          viewMode={viewMode}
          containers={ungroupedContainers}
          onDragOver={dragDropHandlers.onDragOver}
          onDrop={e => dragDropHandlers.onDropOnGroup(e, 'ungrouped')}
          renderContainer={renderContainer}
        />
      )}
    </div>
  )
}
