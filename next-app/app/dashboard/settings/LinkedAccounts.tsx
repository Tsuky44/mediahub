'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Link as LinkIcon, Users, X } from 'lucide-react'

interface UserGroupMember {
    id: number
    userGroupId: string
    instanceId: number
    userId: string
    username?: string
    instance: {
        name: string
        type: string
    }
}

interface UserGroup {
    id: string
    name: string
    members: UserGroupMember[]
    _count?: {
        members: number
    }
}

interface Candidate {
    instanceId: number
    userId: string
    username: string
    instanceName: string
    instanceType: string
    source: 'logs' | 'db' | 'both'
}

export default function LinkedAccounts() {
    const [groups, setGroups] = useState<UserGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    
    // Modal state for adding member
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loadingCandidates, setLoadingCandidates] = useState(false)
    const [showAddMemberModal, setShowAddMemberModal] = useState(false)

    useEffect(() => {
        fetchGroups()
    }, [])

    const filteredCandidates = candidates.sort((a, b) => a.username.localeCompare(b.username))

    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/user/groups')
            if (res.ok) {
                const data = await res.json()
                setGroups(data)
            }
        } catch {
            console.error('Error fetching groups')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGroupName.trim()) return

        try {
            const res = await fetch('/api/user/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            })
            if (res.ok) {
                setNewGroupName('')
                setCreating(false)
                fetchGroups()
            } else {
                const text = await res.text()
                alert(`Erreur lors de la création du groupe: ${text || res.statusText}`)
            }
        } catch {
            console.error('Error creating group')
            alert('Erreur réseau ou serveur lors de la création du groupe.')
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return

        try {
            const res = await fetch(`/api/user/groups/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setGroups(prev => prev.filter(g => g.id !== id))
            } else {
                const errorData = await res.json().catch(() => ({ details: 'Erreur inconnue' }))
                alert(`Erreur lors de la suppression: ${errorData.details || res.statusText}`)
            }
        } catch (error) {
            console.error('Error deleting group:', error)
            alert('Erreur réseau lors de la suppression du groupe.')
        }
    }

    const openAddMemberModal = async (group: UserGroup) => {
        setSelectedGroup(group)
        setShowAddMemberModal(true)
        setLoadingCandidates(true)
        try {
            const res = await fetch('/api/user/candidates')
            if (res.ok) {
                const data = await res.json()
                setCandidates(data)
            }
        } catch (error) {
            console.error('Error fetching candidates:', error)
        } finally {
            setLoadingCandidates(false)
        }
    }

    const handleAddMember = async (candidate: Candidate) => {
        if (!selectedGroup) return

        try {
            const res = await fetch('/api/user/groups/member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userGroupId: selectedGroup.id,
                    instanceId: candidate.instanceId,
                    userId: candidate.userId,
                    username: candidate.username
                })
            })

            if (res.ok) {
                // Refresh groups to show new member
                await fetchGroups()
                // Remove candidate from list locally to avoid double add
                setCandidates(prev => prev.filter(c => 
                    !(c.instanceId === candidate.instanceId && c.userId === candidate.userId)
                ))
            } else if (res.status === 409) {
                alert('Cet utilisateur est déjà dans un groupe.')
            }
        } catch (error) {
            console.error('Error adding member:', error)
        }
    }

    const handleRemoveMember = async (memberId: number) => {
        if (!confirm('Retirer ce compte du groupe ?')) return

        try {
            const res = await fetch('/api/user/groups/member', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId })
            })
            if (res.ok) {
                fetchGroups()
            }
        } catch (error) {
            console.error('Error removing member:', error)
        }
    }

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
                <form onSubmit={handleCreateGroup} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center animate-fade-in">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nom du groupe (ex: Mathis)"
                        className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        autoFocus
                    />
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Créer</button>
                    <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Annuler</button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => (
                    <div key={group.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                    <Users size={20} />
                                </div>
                                <h4 className="font-bold text-white text-lg">{group.name}</h4>
                            </div>
                            <button 
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="space-y-2 mb-4">
                            {group.members.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">Aucun compte lié</p>
                            ) : (
                                group.members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between bg-black/20 rounded-lg p-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            <span className="text-gray-300 font-medium">{member.username || member.userId}</span>
                                            <span className="text-gray-500 text-xs">({member.instance.name})</span>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-gray-500 hover:text-red-400 p-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button 
                            onClick={() => openAddMemberModal(group)}
                            className="w-full py-2 border border-dashed border-gray-700 text-gray-400 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <LinkIcon size={14} />
                            Lier un autre compte
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="text-lg font-bold text-white">Ajouter un compte à &quot;{selectedGroup?.name}&quot;</h3>
                            <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {loadingCandidates ? (
                                <div className="text-center py-8 text-gray-400">Chargement des comptes disponibles...</div>
                            ) : filteredCandidates.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    {candidates.length === 0 ? 'Aucun compte disponible à lier.' : 'Aucun compte trouvé avec ce filtre.'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredCandidates.map(candidate => (
                                        <button
                                            key={`${candidate.instanceId}-${candidate.userId}`}
                                            onClick={() => handleAddMember(candidate)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group text-left"
                                        >
                                            <div>
                                                <div className="text-white font-medium flex items-center gap-2">
                                                    {candidate.username}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${
                                                        candidate.instanceType === 'emby' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                                        candidate.instanceType === 'plex' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                                        candidate.instanceType === 'jellyfin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                                        'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                                    }`}>
                                                        {candidate.instanceType}
                                                    </span>
                                                </div>
                                                <div className="text-gray-500 text-xs mt-0.5">
                                                    {candidate.instanceName} • {candidate.source === 'logs' ? 'Vu dans l\'historique' : 'Utilisateur enregistré'}
                                                </div>
                                            </div>
                                            <Plus size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
