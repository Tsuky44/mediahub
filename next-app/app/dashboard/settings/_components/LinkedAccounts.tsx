'use client'

import { Plus, Trash2, Link as LinkIcon, Users, X } from 'lucide-react'

import { useLinkedAccounts } from '../_hooks/useLinkedAccounts'

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
                                            key={candidate.userId}
                                            onClick={() => handleAddMember(candidate)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group text-left"
                                        >
                                            <div>
                                                <div className="text-white font-medium flex items-center gap-2">
                                                    {candidate.username}
                                                </div>
                                                <div className="text-gray-500 text-xs mt-0.5">
                                                    {candidate.source === 'logs' ? 'Vu dans l\'historique' : 'Utilisateur enregistré'}
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
