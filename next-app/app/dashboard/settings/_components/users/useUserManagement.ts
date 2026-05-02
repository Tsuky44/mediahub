'use client'

import { useState, useCallback, useMemo } from 'react'
import type { User, UserRole, ProviderFilter } from '../../_types/user'

export function useUserManagement(users: User[], readOnly: boolean) {
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
    const [filterProvider, setFilterProvider] = useState<ProviderFilter>('all')
    const [bulkRole, setBulkRole] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingNotifsId, setEditingNotifsId] = useState<number | null>(null)

    const filteredUsers = useMemo(() => users.filter(user => {
        if (filterProvider === 'all') return true
        if (filterProvider === 'emby') return !!user.embyUserId
        if (filterProvider === 'plex') return !!user.plexUserId
        if (filterProvider === 'jellyfin') return !!user.jellyfinUserId
        if (filterProvider === 'local') return !user.embyUserId && !user.plexUserId && !user.jellyfinUserId
        return true
    }), [users, filterProvider])

    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedUserIds(filteredUsers.map(u => u.id))
        else setSelectedUserIds([])
    }, [filteredUsers])

    const handleToggleSelect = useCallback((userId: number) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
    }, [])

    const handleBulkApplyRole = useCallback(async (bulkUpdateRole: (ids: number[], role: string) => Promise<number | null>) => {
        if (selectedUserIds.length === 0 || !bulkRole) return
        if (!confirm(`Voulez-vous vraiment changer le rôle de ${selectedUserIds.length} utilisateurs ?`)) return
        const count = await bulkUpdateRole(selectedUserIds, bulkRole)
        if (count !== null) {
            setSelectedUserIds([])
            setBulkRole('')
        }
    }, [selectedUserIds, bulkRole])

    const handleBulkDelete = useCallback(async (bulkDelete: (ids: number[]) => Promise<number | null>) => {
        if (selectedUserIds.length === 0) return
        if (!confirm(`Voulez-vous vraiment supprimer ces ${selectedUserIds.length} utilisateurs ?`)) return
        const count = await bulkDelete(selectedUserIds)
        if (count !== null) setSelectedUserIds([])
    }, [selectedUserIds])

    const showBulkBar = selectedUserIds.length > 0 && !readOnly

    return {
        selectedUserIds,
        filterProvider,
        setFilterProvider,
        bulkRole,
        setBulkRole,
        showCreateModal,
        setShowCreateModal,
        editingNotifsId,
        setEditingNotifsId,
        filteredUsers,
        handleSelectAll,
        handleToggleSelect,
        handleBulkApplyRole,
        handleBulkDelete,
        showBulkBar,
    }
}
