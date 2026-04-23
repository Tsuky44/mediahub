'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DockerViewMode } from '../_types/docker'

const VIEW_MODE_KEY = 'dockerViewMode'
const COLLAPSED_GROUPS_KEY = 'dockerCollapsedGroups'

export interface UseDockerViewPreferencesResult {
    viewMode: DockerViewMode
    setViewMode: (mode: DockerViewMode) => void
    collapsedGroups: string[]
    toggleGroupCollapse: (groupId: string) => void
}

/**
 * Persiste le mode de vue (grid/list) et la liste des groupes repliés
 * dans localStorage.
 */
export function useDockerViewPreferences(): UseDockerViewPreferencesResult {
    const [viewMode, setViewModeState] = useState<DockerViewMode>('grid')
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])

    useEffect(() => {
        const savedMode = localStorage.getItem(VIEW_MODE_KEY) as DockerViewMode | null
        if (savedMode === 'grid' || savedMode === 'list') {
            setViewModeState(savedMode)
        }

        const savedCollapsed = localStorage.getItem(COLLAPSED_GROUPS_KEY)
        if (savedCollapsed) {
            try {
                const parsed = JSON.parse(savedCollapsed)
                if (Array.isArray(parsed)) setCollapsedGroups(parsed)
            } catch (e) {
                console.error('Error parsing collapsed groups', e)
            }
        }
    }, [])

    const setViewMode = useCallback((mode: DockerViewMode) => {
        setViewModeState(mode)
        try {
            localStorage.setItem(VIEW_MODE_KEY, mode)
        } catch (e) {
            console.error('Error saving view mode', e)
        }
    }, [])

    const toggleGroupCollapse = useCallback((groupId: string) => {
        setCollapsedGroups(prev => {
            const next = prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
            try {
                localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next))
            } catch (e) {
                console.error('Error saving collapsed groups', e)
            }
            return next
        })
    }, [])

    return {
        viewMode,
        setViewMode,
        collapsedGroups,
        toggleGroupCollapse,
    }
}
