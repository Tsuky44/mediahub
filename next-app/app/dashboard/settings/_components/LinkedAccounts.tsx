'use client'

import { Plus } from 'lucide-react'
import { useLinkedAccounts } from '../_hooks/useLinkedAccounts'
import { CreateGroupForm } from './linked-accounts/CreateGroupForm'
import { GroupCard } from './linked-accounts/GroupCard'
import { AddMemberModal } from './linked-accounts/AddMemberModal'

export default function LinkedAccounts() {
    const {
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
    } = useLinkedAccounts()

    if (loading) return <div className="text-white">Chargement...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Comptes Liés</h3>
                    <p className="text-gray-400 text-sm mt-1">
                        Regroupez plusieurs comptes (Plex, Emby, etc.) sous une identité unique pour des statistiques unifiées.
                    </p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    Nouveau Groupe
                </button>
            </div>

            {creating && (
                <CreateGroupForm
                    newGroupName={newGroupName}
                    onChange={setNewGroupName}
                    onSubmit={handleCreateGroup}
                    onCancel={() => setCreating(false)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => (
                    <GroupCard
                        key={group.id}
                        group={group}
                        onDelete={() => handleDeleteGroup(group.id)}
                        onRemoveMember={handleRemoveMember}
                        onAddMember={() => openAddMemberModal(group)}
                    />
                ))}
            </div>

            {showAddMemberModal && selectedGroup && (
                <AddMemberModal
                    groupName={selectedGroup.name}
                    candidates={candidates}
                    filteredCandidates={filteredCandidates}
                    loading={loadingCandidates}
                    onClose={() => setShowAddMemberModal(false)}
                    onAdd={handleAddMember}
                />
            )}
        </div>
    )
}
