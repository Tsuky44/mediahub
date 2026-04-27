'use client'

import { useCallback, useState } from 'react'

import {
    createDockerGroup,
    updateDockerGroupName,
    deleteDockerGroup,
    type DockerGroupApiResult,
} from '../_utils/docker-groups-api'
import type { DockerGroup } from '../_types/docker'

interface UseDockerGroupCrudOptions {
    onMutated: () => void
}

interface UseDockerGroupCrudResult {
    /** true while any async write is in-flight */
    loading: boolean
    newGroupName: string
    setNewGroupName: (value: string) => void
    isCreating: boolean
    setIsCreating: (value: boolean) => void
    editingGroup: DockerGroup | null
    setEditingGroup: (group: DockerGroup | null) => void
    /** Returns true on success, false otherwise (caller shows alert). */
    handleCreate: () => Promise<boolean>
    /** Returns true on success. */
    handleUpdate: (groupId: string, name: string) => Promise<boolean>
    /** Returns true on success. Confirms with window.confirm before firing. */
    handleDelete: (groupId: string) => Promise<boolean>
}

/**
 * Owns the create / rename / delete CRUD state for the Docker group manager
 * modal. All three operations share a single `loading` boolean that prevents
 * concurrent writes. Success callbacks trigger `onMutated` so the parent
 * can refresh the group list.
 */
export function useDockerGroupCrud({
    onMutated,
}: UseDockerGroupCrudOptions): UseDockerGroupCrudResult {
    const [editingGroup, setEditingGroup] = useState<DockerGroup | null>(null)
    const [newGroupName, setNewGroupName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(false)

    const run = async (fn: () => Promise<DockerGroupApiResult>, onSuccess?: () => void) => {
        setLoading(true)
        try {
            const res = await fn()
            if (res.ok) {
                onSuccess?.()
                onMutated()
                return true
            }
            alert(res.error)
            return false
        } catch (err) {
            console.error(err)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = useCallback(async () => {
        if (!newGroupName.trim() || loading) return false
        return run(
            () => createDockerGroup(newGroupName),
            () => {
                setNewGroupName('')
                setIsCreating(false)
            }
        )
    }, [newGroupName, loading, run])

    const handleUpdate = useCallback(
        async (groupId: string, name: string) => {
            if (loading) return false
            return run(
                () => updateDockerGroupName(groupId, name),
                () => setEditingGroup(null)
            )
        },
        [loading, run]
    )

    const handleDelete = useCallback(
        async (groupId: string) => {
            if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return false
            return run(() => deleteDockerGroup(groupId))
        },
        [run]
    )

    return {
        loading,
        newGroupName,
        setNewGroupName,
        isCreating,
        setIsCreating,
        editingGroup,
        setEditingGroup,
        handleCreate,
        handleUpdate,
        handleDelete,
    }
}
