'use client'

import { useState } from 'react'

import type { DockerGroup } from '../_types/docker'
import { useDockerGroupCrud } from '../_hooks/useDockerGroupCrud'
import GroupManagerHeader from './group-manager/GroupManagerHeader'
import GroupCreateForm from './group-manager/GroupCreateForm'
import GroupRow from './group-manager/GroupRow'
import GroupListEmpty from './group-manager/GroupListEmpty'

interface GroupManagerProps {
    groups: DockerGroup[]
    canManage?: boolean
    onClose: () => void
    onRefresh: () => void
}

export default function GroupManager({
    groups,
    onClose,
    onRefresh,
    canManage = false,
}: GroupManagerProps) {
    const {
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
    } = useDockerGroupCrud({ onMutated: onRefresh })

    const [editName, setEditName] = useState<string>('')

    const startEditing = (group: DockerGroup) => {
        setEditingGroup(group)
        setEditName(group.name)
    }

    const cancelEditing = () => {
        setEditingGroup(null)
        setEditName('')
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <GroupManagerHeader onClose={onClose} />

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {canManage && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                Nouveau groupe
                            </label>
                            <GroupCreateForm
                                isCreating={isCreating}
                                newGroupName={newGroupName}
                                isLoading={loading}
                                onNameChange={setNewGroupName}
                                onStart={() => setIsCreating(true)}
                                onSubmit={handleCreate}
                                onCancel={() => setIsCreating(false)}
                            />
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                            Groupes Existants ({groups.length})
                        </label>
                        <div className="grid gap-4">
                            {groups.map(group => (
                                <GroupRow
                                    key={group.id}
                                    group={group}
                                    isEditing={editingGroup?.id === group.id}
                                    canManage={canManage}
                                    isLoading={loading}
                                    editingName={editName}
                                    onEdit={startEditing}
                                    onDelete={handleDelete}
                                    onConfirmEdit={handleUpdate}
                                    onCancelEdit={cancelEditing}
                                    onEditNameChange={setEditName}
                                />
                            ))}

                            {groups.length === 0 && !isCreating && <GroupListEmpty />}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 flex justify-center backdrop-blur-md">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Système de gestion de groupes v2.0
                    </p>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1f2937;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #374151;
                }
            `}</style>
        </div>
    )
}
