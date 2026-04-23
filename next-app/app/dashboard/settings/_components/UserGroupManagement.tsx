
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
    Users, 
    Plus, 
    Trash2, 
    Edit2, 
    Shield, 
    UserPlus, 
    X,
    Check,
    ChevronRight,
    Search
} from 'lucide-react'

import { 
    createUserGroup, 
    updateUserGroup, 
    deleteUserGroup, 
    addUserToGroup,
    addUsersToGroup,
    removeUserFromGroup,
    getUserGroups
} from '../group-actions'

const isDev = process.env.NODE_ENV === 'development';
const error = (...args: any[]) => { if (isDev) console.error(...args); };

interface UserGroup {
    id: string
    name: string
    roleId: string | null
    role: { id: string, name: string } | null
    members: { userId: number, user: { id: number, name: string | null, email: string | null, image: string | null } }[]
}

interface Props {
    initialGroups: UserGroup[]
    users: any[] // User list for selection
    roles: any[] // Role list for selection
}

export default function UserGroupManagement({ initialGroups, users, roles }: Props) {
    const [groups, setGroups] = useState<UserGroup[]>(initialGroups)
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupRoleId, setNewGroupRoleId] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editRoleId, setEditRoleId] = useState('')

    // Member management state
    const [showAddMember, setShowAddMember] = useState(false)
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [memberSearch, setMemberSearch] = useState('')

    const refreshGroups = async () => {
        try {
            const updatedGroups = await getUserGroups()
            // @ts-ignore - Prisma types are tricky with includes
            setGroups(updatedGroups)
            if (selectedGroup) {
                const updatedSelected = updatedGroups.find(g => g.id === selectedGroup.id)
                if (updatedSelected) {
                    // @ts-ignore
                    setSelectedGroup(updatedSelected)
                }
            }
        } catch (err) {
            error('Failed to refresh groups', err)
        }
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return

        try {
            await createUserGroup(newGroupName, newGroupRoleId || undefined)
            setNewGroupName('')
            setNewGroupRoleId('')
            setIsCreating(false)
            toast.success('Groupe créé avec succès')
            refreshGroups()
        } catch (error) {
            toast.error('Erreur lors de la création du groupe')
        }
    }

    const handleUpdateGroup = async () => {
        if (!selectedGroup || !editName.trim()) return

        try {
            await updateUserGroup(selectedGroup.id, editName, editRoleId || undefined)
            setIsEditing(false)
            toast.success('Groupe mis à jour')
            refreshGroups()
        } catch (error) {
            toast.error('Erreur lors de la mise à jour du groupe')
        }
    }

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return

        try {
            await deleteUserGroup(groupId)
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null)
            }
            toast.success('Groupe supprimé')
            refreshGroups()
        } catch (error) {
            toast.error('Erreur lors de la suppression du groupe')
        }
    }

    const handleAddMember = async () => {
        if (!selectedGroup || selectedUserIds.length === 0) return

        try {
            await addUsersToGroup(selectedGroup.id, selectedUserIds.map(id => parseInt(id)))
            setSelectedUserIds([])
            setShowAddMember(false)
            toast.success('Membres ajoutés au groupe')
            refreshGroups()
        } catch (error) {
            toast.error('Erreur lors de l\'ajout des membres')
        }
    }

    const handleRemoveMember = async (userId: number) => {
        if (!selectedGroup) return
        if (!confirm('Retirer cet utilisateur du groupe ?')) return

        try {
            await removeUserFromGroup(selectedGroup.id, userId)
            toast.success('Membre retiré du groupe')
            refreshGroups()
        } catch (error) {
            toast.error('Erreur lors du retrait du membre')
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
            {/* Left Column: Group List */}
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
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Nom du groupe"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-indigo-500"
                            autoFocus
                        />
                        <select
                            value={newGroupRoleId}
                            onChange={(e) => setNewGroupRoleId(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Aucun rôle assigné</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleCreateGroup}
                                disabled={!newGroupName.trim()}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                    {groups.length === 0 && !isCreating && (
                        <div className="text-center py-8 text-gray-500 text-sm italic">
                            Aucun groupe créé
                        </div>
                    )}
                    
                    {groups.map(group => (
                        <div 
                            key={group.id}
                            onClick={() => {
                                setSelectedGroup(group)
                                setIsEditing(false)
                            }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                                selectedGroup?.id === group.id
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

            {/* Right Column: Details */}
            <div className="flex-1 flex flex-col">
                {selectedGroup ? (
                    <>
                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/10">
                            <div>
                                {isEditing ? (
                                    <div className="flex flex-col gap-3 min-w-[300px]">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
                                        />
                                        <select
                                            value={editRoleId}
                                            onChange={(e) => setEditRoleId(e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Aucun rôle assigné</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={handleUpdateGroup}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Sauvegarder
                                            </button>
                                            <button 
                                                onClick={() => setIsEditing(false)}
                                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg flex items-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Annuler
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold text-white mb-2">{selectedGroup.name}</h2>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                                                <Shield className="w-4 h-4 text-indigo-400" />
                                                {selectedGroup.role ? (
                                                    <span className="text-indigo-200 font-medium">{selectedGroup.role.name}</span>
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
                                        onClick={() => {
                                            setEditName(selectedGroup.name)
                                            setEditRoleId(selectedGroup.roleId || '')
                                            setIsEditing(true)
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteGroup(selectedGroup.id)}
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
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-medium text-white mb-3">Ajouter un membre</h4>
                                    
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="text"
                                            placeholder="Rechercher un utilisateur..."
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="max-h-[240px] overflow-y-auto mb-3 space-y-1 pr-1 custom-scrollbar">
                                        {users
                                            .filter(u => !selectedGroup.members.some(m => m.userId === u.id))
                                            .filter(u => 
                                                (u.name?.toLowerCase() || '').includes(memberSearch.toLowerCase()) || 
                                                (u.email?.toLowerCase() || '').includes(memberSearch.toLowerCase())
                                            )
                                            .length === 0 ? (
                                                <div className="text-center py-8 text-gray-500 text-xs italic">
                                                    Aucun utilisateur trouvé
                                                </div>
                                            ) : (
                                                users
                                                    .filter(u => !selectedGroup.members.some(m => m.userId === u.id))
                                                    .filter(u => 
                                                        (u.name?.toLowerCase() || '').includes(memberSearch.toLowerCase()) || 
                                                        (u.email?.toLowerCase() || '').includes(memberSearch.toLowerCase())
                                                    )
                                                    .map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => {
                                                                const userId = user.id.toString()
                                                                setSelectedUserIds(prev => 
                                                                    prev.includes(userId) 
                                                                        ? prev.filter(id => id !== userId)
                                                                        : [...prev, userId]
                                                                )
                                                            }}
                                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${
                                                                selectedUserIds.includes(user.id.toString())
                                                                    ? 'bg-indigo-600/20 border-indigo-500/50'
                                                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                                            }`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-medium text-white truncate">{user.name || 'Sans nom'}</div>
                                                                <div className="text-xs text-gray-400 truncate">{user.email}</div>
                                                            </div>
                                                            {selectedUserIds.includes(user.id.toString()) ? (
                                                                <div className="bg-indigo-500 rounded-full p-0.5">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full border border-gray-600" />
                                                            )}
                                                        </div>
                                                    ))
                                            )
                                        }
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                                        <button 
                                            onClick={() => {
                                                setShowAddMember(false)
                                                setMemberSearch('')
                                                setSelectedUserIds([])
                                            }}
                                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            onClick={handleAddMember}
                                            disabled={selectedUserIds.length === 0}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Ajouter {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {selectedGroup.members.length === 0 ? (
                                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                        <p className="text-gray-500">Aucun membre dans ce groupe</p>
                                    </div>
                                ) : (
                                    selectedGroup.members.map(member => (
                                        <div 
                                            key={member.userId} 
                                            className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {member.user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{member.user.name || 'Sans nom'}</div>
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
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <p>Sélectionnez un groupe pour voir les détails</p>
                    </div>
                )}
            </div>
        </div>
    )
}
