'use client'

import { useCallback, useState } from 'react'
import { toast } from 'react-hot-toast'
import type { User, CreateUserPayload, SyncProvider } from '../_types/user'

export interface UseUsersResult {
    users: User[]
    updatingId: number | null
    syncingProvider: SyncProvider | null
    createUser: (payload: CreateUserPayload) => Promise<User | null>
    updateUserRole: (userId: number, value: string) => Promise<void>
    updateUserNotifications: (userId: number, field: string, value: string) => Promise<void>
    bulkUpdateRole: (userIds: number[], roleValue: string) => Promise<number | null>
    bulkDelete: (userIds: number[]) => Promise<number | null>
    syncProvider: (provider: SyncProvider) => Promise<void>
}

/**
 * Gere la liste des utilisateurs (create, update role/notif, bulk, sync avec Emby/Plex/Jellyfin).
 */
export function useUsers(initialUsers: User[]): UseUsersResult {
    const [users, setUsers] = useState<User[]>(initialUsers)
    const [updatingId, setUpdatingId] = useState<number | null>(null)
    const [syncingProvider, setSyncingProvider] = useState<SyncProvider | null>(null)

    const refetch = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users')
            if (res.ok) setUsers(await res.json())
        } catch (e) {
            console.error(e)
        }
    }, [])

    const createUser = useCallback(async (payload: CreateUserPayload): Promise<User | null> => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!response.ok) {
                const error = await response.json().catch(() => ({}))
                throw new Error(error.error || 'Erreur lors de la création')
            }
            const newUser: User = await response.json()
            setUsers(prev => [...prev, newUser])
            toast.success(`Utilisateur ${newUser.name} créé`)
            return newUser
        } catch (e: any) {
            toast.error(e.message)
            return null
        }
    }, [])

    const updateUserRole = useCallback(async (userId: number, value: string) => {
        setUpdatingId(userId)
        try {
            const payload: any = { id: userId }
            if (value === 'admin') {
                payload.role = 'admin'
                payload.roleId = null
            } else if (value === '') {
                payload.role = 'user'
                payload.roleId = null
            } else {
                payload.role = 'user'
                payload.roleId = value
            }

            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!response.ok) throw new Error('Failed to update user')
            const updated: User = await response.json()
            setUsers(prev => prev.map(u => u.id === userId ? updated : u))
            toast.success('Rôle mis à jour')
        } catch {
            toast.error('Erreur lors de la mise à jour')
        } finally {
            setUpdatingId(null)
        }
    }, [])

    const updateUserNotifications = useCallback(async (userId: number, field: string, value: string) => {
        try {
            let finalValue = value
            if (field === 'discordUserId' && value.startsWith('@')) {
                finalValue = value.substring(1)
            }
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, [field]: finalValue }),
            })
            if (!response.ok) throw new Error('Failed to update user notifications')
            const updated: User = await response.json()
            setUsers(prev => prev.map(u => u.id === userId ? updated : u))
            toast.success('Notifications mises à jour')
        } catch {
            toast.error('Erreur lors de la mise à jour des notifications')
        }
    }, [])

    const bulkUpdateRole = useCallback(async (userIds: number[], roleValue: string): Promise<number | null> => {
        if (userIds.length === 0 || !roleValue) return null
        try {
            const payload: any = { userIds }
            if (roleValue === 'none') {
                payload.role = 'user'
                payload.roleId = null
            } else {
                payload.role = 'user'
                payload.roleId = roleValue
            }

            const response = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!response.ok) throw new Error('Bulk update failed')
            const data = await response.json()
            toast.success(`${data.count} utilisateurs mis à jour`)
            await refetch()
            return data.count
        } catch (e) {
            console.error(e)
            toast.error('Erreur lors de la mise à jour de masse')
            return null
        }
    }, [refetch])

    const bulkDelete = useCallback(async (userIds: number[]): Promise<number | null> => {
        if (userIds.length === 0) return null
        try {
            const response = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds, action: 'delete' }),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'Delete failed')
            }
            const data = await response.json()
            toast.success(`${data.count} utilisateurs supprimés`)
            await refetch()
            return data.count
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la suppression')
            return null
        }
    }, [refetch])

    const syncProvider = useCallback(async (provider: SyncProvider) => {
        setSyncingProvider(provider)
        try {
            const response = await fetch('/api/admin/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            })
            if (!response.ok) throw new Error('Sync failed')
            const data = await response.json()

            if (data.details && data.details.length > 0) {
                toast(`Sync terminée avec avertissements: ${data.details.length} erreurs`, { icon: '⚠️' })
                console.warn('Sync details:', data.details)
            }

            toast.success(`${data.created} utilisateurs ajoutés, ${data.updated} mis à jour, ${data.deleted} supprimés`)
            await refetch()
        } catch (e) {
            toast.error('Erreur lors de la synchronisation')
            console.error(e)
        } finally {
            setSyncingProvider(null)
        }
    }, [refetch])

    return {
        users,
        updatingId,
        syncingProvider,
        createUser,
        updateUserRole,
        updateUserNotifications,
        bulkUpdateRole,
        bulkDelete,
        syncProvider,
    }
}
