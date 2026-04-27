'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface UserGroupMember {
    id: number
    userGroupId: string
    userId: string
    username?: string
}

export interface UserGroup {
    id: string
    name: string
    members: UserGroupMember[]
    _count?: {
        members: number
    }
}

export interface Candidate {
    userId: string
    username: string
    source: 'logs' | 'db' | 'both'
}

const groupsKey = ['linked-accounts', 'groups'] as const
const candidatesKey = ['linked-accounts', 'candidates'] as const

export function useLinkedAccounts() {
    const queryClient = useQueryClient()
    const [creating, setCreating] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
    const [showAddMemberModal, setShowAddMemberModal] = useState(false)

    const { data: groups = [], isLoading: loading } = useQuery({
        queryKey: groupsKey,
        queryFn: async () => {
            const res = await fetch('/api/user/groups')
            if (!res.ok) throw new Error('Failed to fetch groups')
            return res.json() as Promise<UserGroup[]>
        },
    })

    const createGroupMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch('/api/user/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || res.statusText)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupsKey })
            setNewGroupName('')
            setCreating(false)
        },
    })

    const deleteGroupMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/user/groups/${id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json().catch(() => ({ details: 'Erreur inconnue' }))
                throw new Error(data.details || res.statusText)
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
    })

    const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
        queryKey: candidatesKey,
        queryFn: async () => {
            const res = await fetch('/api/user/candidates')
            if (!res.ok) throw new Error('Failed to fetch candidates')
            return res.json() as Promise<Candidate[]>
        },
        enabled: showAddMemberModal,
    })

    const addMemberMutation = useMutation({
        mutationFn: async (payload: { userGroupId: string; userId: string; username: string }) => {
            const res = await fetch('/api/user/groups/member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                if (res.status === 409) throw new Error('CONFLICT')
                throw new Error('Failed to add member')
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
    })

    const removeMemberMutation = useMutation({
        mutationFn: async (memberId: number) => {
            const res = await fetch('/api/user/groups/member', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId }),
            })
            if (!res.ok) throw new Error('Failed to remove member')
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
    })

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGroupName.trim()) return
        try {
            await createGroupMutation.mutateAsync(newGroupName.trim())
        } catch (err: unknown) {
            alert(`Erreur lors de la création du groupe: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return
        try {
            await deleteGroupMutation.mutateAsync(id)
        } catch (err: unknown) {
            alert(`Erreur lors de la suppression: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    const openAddMemberModal = (group: UserGroup) => {
        setSelectedGroup(group)
        setShowAddMemberModal(true)
    }

    const handleAddMember = async (candidate: Candidate) => {
        if (!selectedGroup) return
        try {
            await addMemberMutation.mutateAsync({
                userGroupId: selectedGroup.id,
                userId: candidate.userId,
                username: candidate.username,
            })
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'CONFLICT') {
                alert('Cet utilisateur est déjà dans un groupe.')
            }
        }
    }

    const handleRemoveMember = async (memberId: number) => {
        if (!confirm('Retirer ce compte du groupe ?')) return
        try {
            await removeMemberMutation.mutateAsync(memberId)
        } catch {
            console.error('Error removing member')
        }
    }

    const filteredCandidates = useMemo(
        () => [...candidates].sort((a, b) => a.username.localeCompare(b.username)),
        [candidates]
    )

    return {
        groups,
        loading,
        creating,
        setCreating,
        newGroupName,
        setNewGroupName,
        selectedGroup,
        showAddMemberModal,
        setShowAddMemberModal,
        candidates,
        filteredCandidates,
        loadingCandidates,
        handleCreateGroup,
        handleDeleteGroup,
        openAddMemberModal,
        handleAddMember,
        handleRemoveMember,
    }
}
