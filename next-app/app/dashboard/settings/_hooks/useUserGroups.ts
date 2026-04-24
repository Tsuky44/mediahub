'use client'

import { useCallback, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
    createUserGroup,
    updateUserGroup,
    deleteUserGroup,
    addUsersToGroup,
    removeUserFromGroup,
    getUserGroups,
} from '../group-actions'
import type { UserGroup } from '../_types/user-group'

const isDev = process.env.NODE_ENV === 'development'
const logError = (...args: any[]) => { if (isDev) console.error(...args) }

export interface UseUserGroupsResult {
    groups: UserGroup[]
    selectedGroup: UserGroup | null
    selectGroup: (group: UserGroup | null) => void
    createGroup: (name: string, roleId?: string) => Promise<boolean>
    updateGroup: (groupId: string, name: string, roleId?: string) => Promise<boolean>
    deleteGroup: (groupId: string) => Promise<boolean>
    addMembers: (groupId: string, userIds: number[]) => Promise<boolean>
    removeMember: (groupId: string, userId: number) => Promise<boolean>
    refresh: () => Promise<void>
}

/**
 * Gere les groupes d'utilisateurs (CRUD + membres) avec rafraichissement automatique
 * et mise a jour du group selectionne apres modification.
 */
export function useUserGroups(initialGroups: UserGroup[]): UseUserGroupsResult {
    const [groups, setGroups] = useState<UserGroup[]>(initialGroups)
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)

    const refresh = useCallback(async () => {
        try {
            const updated = (await getUserGroups()) as unknown as UserGroup[]
            setGroups(updated)
            setSelectedGroup(prev => {
                if (!prev) return null
                return updated.find(g => g.id === prev.id) || null
            })
        } catch (err) {
            logError('Failed to refresh groups', err)
        }
    }, [])

    const createGroup = useCallback(async (name: string, roleId?: string): Promise<boolean> => {
        if (!name.trim()) return false
        try {
            await createUserGroup(name, roleId || undefined)
            toast.success('Groupe créé avec succès')
            await refresh()
            return true
        } catch {
            toast.error('Erreur lors de la création du groupe')
            return false
        }
    }, [refresh])

    const updateGroup = useCallback(async (groupId: string, name: string, roleId?: string): Promise<boolean> => {
        if (!name.trim()) return false
        try {
            await updateUserGroup(groupId, name, roleId || undefined)
            toast.success('Groupe mis à jour')
            await refresh()
            return true
        } catch {
            toast.error('Erreur lors de la mise à jour du groupe')
            return false
        }
    }, [refresh])

    const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            await deleteUserGroup(groupId)
            setSelectedGroup(prev => (prev?.id === groupId ? null : prev))
            toast.success('Groupe supprimé')
            await refresh()
            return true
        } catch {
            toast.error('Erreur lors de la suppression du groupe')
            return false
        }
    }, [refresh])

    const addMembers = useCallback(async (groupId: string, userIds: number[]): Promise<boolean> => {
        if (userIds.length === 0) return false
        try {
            await addUsersToGroup(groupId, userIds)
            toast.success('Membres ajoutés au groupe')
            await refresh()
            return true
        } catch {
            toast.error("Erreur lors de l'ajout des membres")
            return false
        }
    }, [refresh])

    const removeMember = useCallback(async (groupId: string, userId: number): Promise<boolean> => {
        try {
            await removeUserFromGroup(groupId, userId)
            toast.success('Membre retiré du groupe')
            await refresh()
            return true
        } catch {
            toast.error('Erreur lors du retrait du membre')
            return false
        }
    }, [refresh])

    return {
        groups,
        selectedGroup,
        selectGroup: setSelectedGroup,
        createGroup,
        updateGroup,
        deleteGroup,
        addMembers,
        removeMember,
        refresh,
    }
}
