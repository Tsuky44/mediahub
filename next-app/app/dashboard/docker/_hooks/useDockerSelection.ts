'use client'

import { useCallback, useMemo, useState } from 'react'
import type { DockerContainer } from '../_types/docker'

export interface UseDockerSelectionResult {
    selectedIds: Set<string>
    isSelected: (id: string) => boolean
    toggle: (id: string) => void
    /** Sélectionne la liste fournie, ou la désélectionne si elle l'est déjà entièrement. */
    toggleMany: (ids: string[]) => void
    clear: () => void
    selectedContainers: DockerContainer[]
    count: number
}

/**
 * Sélection multiple de conteneurs.
 *
 * La sélection est recoupée avec la liste courante à chaque rendu : un
 * conteneur supprimé ou disparu du filtre ne peut pas rester sélectionné de
 * façon invisible et se retrouver dans une action de masse.
 */
export function useDockerSelection(containers: DockerContainer[]): UseDockerSelectionResult {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const selectedContainers = useMemo(
        () => containers.filter(c => selectedIds.has(c.id)),
        [containers, selectedIds]
    )

    const toggle = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const toggleMany = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            const allSelected = ids.length > 0 && ids.every(id => next.has(id))

            for (const id of ids) {
                if (allSelected) next.delete(id)
                else next.add(id)
            }
            return next
        })
    }, [])

    const clear = useCallback(() => setSelectedIds(new Set()), [])

    return {
        selectedIds,
        isSelected: (id: string) => selectedIds.has(id),
        toggle,
        toggleMany,
        clear,
        selectedContainers,
        count: selectedContainers.length,
    }
}
