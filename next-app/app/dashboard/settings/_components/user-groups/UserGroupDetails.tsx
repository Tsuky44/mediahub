'use client'

import { useState } from 'react'
import { Users, Shield, Edit2, Trash2, X, Check, UserPlus } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption, UserGroupUserOption } from '../../_types/user-group'
import { AddMemberForm } from './AddMemberForm'

interface GroupEditFormProps {
    group: UserGroup
    roles: UserGroupRoleOption[]
    onSave: (name: string, roleId: string) => void
    onCancel: () => void
}

function GroupEditForm({ group, roles, onSave, onCancel }: GroupEditFormProps) {
    const [name, setName] = useState(group.name)
    const [roleId, setRoleId] = useState(group.roleId || '')

    return (
        <div className="flex flex-col gap-3 min-w-[300px]">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
            />
            <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
                <option value="">Aucun rôle assigné</option>
                {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => onSave(name, roleId)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg flex items-center gap-1"
                >
                    <Check className="w-3 h-3" /> Sauvegarder
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg flex items-center gap-1"
                >
                    <X className="w-3 h-3" /> Annuler
                </button>
            </div>
        </div>
    )
}

interface UserGroupDetailsProps {
    group: UserGroup
    roles: UserGroupRoleOption[]
    users: UserGroupUserOption[]
    onUpdate: (groupId: string, name: string, roleId: string) => void
    onDelete: (groupId: string) => void
    onAddMembers: (groupId: string, userIds: number[]) => void
    onRemoveMember: (groupId: string, userId: number) => void
}

/** Panneau droite : details d'un groupe + membres + formulaire d'ajout. */
export function UserGroupDetails({
    group,
    roles,
    users,
    onUpdate,
    onDelete,
    onAddMembers,
    onRemoveMember,
}: UserGroupDetailsProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [showAddMember, setShowAddMember] = useState(false)

    const handleDelete = () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
            onDelete(group.id)
        }
    }

    const handleRemoveMember = (userId: number) => {
        if (confirm('Retirer cet utilisateur du groupe ?')) {
            onRemoveMember(group.id, userId)
        }
    }

    const handleSave = (name: string, roleId: string) => {
        onUpdate(group.id, name, roleId)
        setIsEditing(false)
    }

    const handleAdd = (userIds: number[]) => {
        onAddMembers(group.id, userIds)
        setShowAddMember(false)
    }

    return (
        <>
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/10">
                <div>
                    {isEditing ? (
                        <GroupEditForm
                            group={group}
                            roles={roles}
                            onSave={handleSave}
                            onCancel={() => setIsEditing(false)}
                        />
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-white mb-2">{group.name}</h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                                    <Shield className="w-4 h-4 text-indigo-400" />
                                    {group.role ? (
                                        <span className="text-indigo-200 font-medium">{group.role.name}</span>
                                    ) : (
                                        <span className="text-gray-500 italic">Aucun rôle</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Modifier"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Membres du groupe</h3>
                    <button
                        onClick={() => setShowAddMember(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-sm transition-colors border border-indigo-500/30"
                    >
                        <UserPlus className="w-4 h-4" />
                        Ajouter un membre
                    </button>
                </div>

                {showAddMember && (
                    <AddMemberForm
                        users={users}
                        excludedUserIds={group.members.map(m => m.userId)}
                        onAdd={handleAdd}
                        onCancel={() => setShowAddMember(false)}
                    />
                )}

                <div className="space-y-2">
                    {group.members.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500">Aucun membre dans ce groupe</p>
                        </div>
                    ) : (
                        group.members.map(member => (
                            <div
                                key={member.userId}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                        {member.user.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {member.user.name || 'Sans nom'}
                                        </div>
                                        <div className="text-xs text-gray-500">{member.user.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveMember(member.userId)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Retirer du groupe"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}
