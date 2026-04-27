'use client'

import { useCallback, useState } from 'react'

import { useDragAutoScroll } from './useDragAutoScroll'
import type { DockerContainer } from '../_types/docker'

interface UseDockerDragDropOptions {
    containers: DockerContainer[]
    moveContainer: (containerName: string, targetGroupId: string) => Promise<void> | void
}

interface UseDockerDragDropResult {
    draggedContainerId: string | null
    isDragging: boolean
    onDragStart: (e: React.DragEvent, containerId: string) => void
    onDragEnd: () => void
    onDragOver: (e: React.DragEvent) => void
    onDropOnGroup: (e: React.DragEvent, targetGroupId: string) => Promise<void>
}

/**
 * Owns the HTML5 drag & drop session for moving containers between groups.
 * Side effects:
 * - Wires `useDragAutoScroll` so the window auto-scrolls near the viewport
 *   edges while dragging.
 * - Reads the dragged container id from local state with a fallback to the
 *   dataTransfer payload (preserves the original safety net).
 */
export function useDockerDragDrop({
    containers,
    moveContainer,
}: UseDockerDragDropOptions): UseDockerDragDropResult {
    const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null)
    const isDragging = !!draggedContainerId

    useDragAutoScroll(isDragging)

    const onDragStart = useCallback((e: React.DragEvent, containerId: string) => {
        e.dataTransfer.setData('text/plain', containerId)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedContainerId(containerId)
    }, [])

    const onDragEnd = useCallback(() => {
        setDraggedContainerId(null)
    }, [])

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const onDropOnGroup = useCallback(
        async (e: React.DragEvent, targetGroupId: string) => {
            e.preventDefault()
            const containerId = draggedContainerId || e.dataTransfer.getData('text/plain')
            setDraggedContainerId(null)

            if (!containerId) return
            const container = containers.find(c => c.id === containerId)
            if (!container) return

            await moveContainer(container.name, targetGroupId)
        },
        [draggedContainerId, containers, moveContainer]
    )

    return {
        draggedContainerId,
        isDragging,
        onDragStart,
        onDragEnd,
        onDragOver,
        onDropOnGroup,
    }
}
