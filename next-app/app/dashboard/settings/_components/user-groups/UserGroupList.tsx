'use client'

import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption } from '../../_types/user-group'

interface CreateFormProps {
    roles: UserGroupRoleOption[]
    onCreate: (name: string, roleId: string) => void
    onCancel: () => void
}

function CreateGroupForm({ roles, onCreate, onCancel }: CreateFormProps) {
    const [name, setName] = useState('')
    const [roleId, setRoleId] = useState('')

    return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
            <input
                type="text"
                placeholder="Nom du groupe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-indigo-500"
                autoFocus
            />
            <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-indigo-500"
            >
                <option value="">Aucun rôle assigné</option>
                {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={() => onCreate(name, roleId)}
                    disabled={!name.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                    Créer
                </button>
            </div>
        </div>
    )
}

interface UserGroupListProps {
    groups: UserGroup[]
    roles: UserGroupRoleOption[]
    selectedGroupId: string | null
    onSelect: (group: UserGroup) => void
    onCreate: (name: string, roleId: string) => void
}

/**
 * Liste des groupes d'utilisateurs (colonne gauche) avec bouton "+" pour creer
 * un nouveau groupe via un formulaire inline.
 */
export function UserGroupList({ groups, roles, selectedGroupId, onSelect, onCreate }: UserGroupListProps) {
    const [isCreating, setIsCreating] = useState(false)

    const handleCreate = (name: string, roleId: string) => {
        onCreate(name, roleId)
        setIsCreating(false)
    }

    return (
        <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-white/10 pr-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Groupes
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    title="Créer un groupe"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {isCreating && (
                <CreateGroupForm
                    roles={roles}
                    onCreate={handleCreate}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                {groups.length === 0 && !isCreating && (
                    <div className="text-center py-8 text-gray-500 text-sm italic">Aucun groupe créé</div>
                )}

                {groups.map(group => (
                    <div
                        key={group.id}
                        onClick={() => onSelect(group)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                            selectedGroupId === group.id
                                ? 'bg-indigo-500/20 border-indigo-500/50'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-white mb-1">{group.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Users className="w-3 h-3" />
                                    <span>{group.members.length} membres</span>
                                </div>
                            </div>
                            {group.role && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                                    {group.role.name}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
