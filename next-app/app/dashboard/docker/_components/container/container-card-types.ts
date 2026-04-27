import type { DockerContainer, DockerAction, DockerViewMode } from '../../_types/docker'

export interface ContainerPermissions {
    canManageContainers: boolean
    canAccessConsole: boolean
    canReadDetails: boolean
    canReadLogs: boolean
    canReadStats: boolean
    canManageGroups: boolean
}

export interface ContainerCardProps {
    container: DockerContainer
    viewMode: DockerViewMode
    permissions: ContainerPermissions
    isActionLoading: boolean
    isDragged: boolean
    isMenuOpen: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
    onSelectStats: () => void
    onToggleMenu: (e: React.MouseEvent) => void
    onCloseMenu: () => void
    onShowLogs: () => void
    onShowTerminal: () => void
    onShowDetails: () => void
    /** containerRef est soit l'id (list view) soit le nom (grid menu) pour preserver le comportement d'origine. */
    onAction: (containerRef: string, action: DockerAction) => void
}
