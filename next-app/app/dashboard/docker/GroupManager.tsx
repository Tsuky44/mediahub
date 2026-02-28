
import { useState } from 'react'
import { Plus, Trash, X, Save, Edit2, Check, Loader2, Layers } from 'lucide-react'
import clsx from 'clsx'

interface DockerGroup {
    id: string
    name: string
    members: { containerName: string }[]
}

interface GroupManagerProps {
    groups: DockerGroup[]
    canManage?: boolean
    onClose: () => void
    onRefresh: () => void
}

export default function GroupManager({ groups, onClose, onRefresh, canManage = false }: GroupManagerProps) {
    const [editingGroup, setEditingGroup] = useState<DockerGroup | null>(null)
    const [newGroupName, setNewGroupName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!newGroupName.trim() || loading) return
        setLoading(true)

        try {
            const res = await fetch('/api/docker/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName, members: [] })
            })
            
            if (res.ok) {
                setNewGroupName('')
                setIsCreating(false)
                onRefresh()
            } else {
                const data = await res.json()
                alert(data.error || 'Erreur lors de la création du groupe')
            }
        } catch (error) {
            console.error(error)
            alert('Erreur réseau lors de la création du groupe')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (groupId: string, name: string) => {
        if (loading) return
        setLoading(true)
        try {
            // Only update name, members are managed via Drag & Drop in the main view
            const res = await fetch(`/api/docker/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            if (res.ok) {
                setEditingGroup(null)
                onRefresh()
            } else {
                const data = await res.json()
                alert(data.error || 'Erreur lors de la mise à jour du groupe')
            }
        } catch (error) {
            console.error(error)
            alert('Erreur réseau lors de la mise à jour du groupe')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (groupId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) return

        try {
            const res = await fetch(`/api/docker/groups/${groupId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                onRefresh()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const startEditing = (group: DockerGroup) => {
        if (!canManage) return
        setEditingGroup(group)
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                            <Layers className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Gestion des Groupes</h2>
                            <p className="text-sm text-gray-400 font-medium">Créez ou supprimez vos groupes de conteneurs</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90 border border-transparent hover:border-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                        {/* Create New Group Section */}
                        {canManage && (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                Nouveau groupe
                            </label>
                            {!isCreating ? (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full py-5 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-3 font-bold group duration-300"
                                >
                                    <div className="p-2 bg-white/5 rounded-xl group-hover:bg-indigo-500/20 transition-colors duration-300">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    Créer un groupe de conteneurs
                                </button>
                            ) : (
                                <div className="p-1.5 bg-black/40 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl">
                                    <div className="flex gap-2 p-1">
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Nom du groupe..."
                                            className="flex-1 bg-white/5 border-transparent rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:outline-none focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                        />
                                        <button
                                            onClick={handleCreate}
                                            disabled={loading || !newGroupName.trim()}
                                            className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 hover:scale-105"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>Créer</span>
                                        </button>
                                        <button
                                            onClick={() => setIsCreating(false)}
                                            className="px-4 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all hover:rotate-90 duration-300"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Group List Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                            Groupes Existants ({groups.length})
                        </label>
                        <div className="grid gap-4">
                            {groups.map(group => (
                                <div 
                                    key={group.id} 
                                    className={clsx(
                                        "group/card relative rounded-3xl transition-all duration-300 backdrop-blur-md overflow-hidden",
                                        editingGroup?.id === group.id 
                                            ? "bg-indigo-500/10 border border-indigo-500/30 p-5 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20" 
                                            : "bg-black/20 border border-white/5 p-5 hover:border-indigo-500/20 hover:bg-white/[0.03] hover:shadow-2xl hover:shadow-indigo-500/5"
                                    )}
                                >
                                    {/* Background Gradient */}
                                    <div className={clsx(
                                        "absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none",
                                        "bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent"
                                    )} />

                                    {editingGroup?.id === group.id ? (
                                        <div className="space-y-5 animate-in fade-in duration-300 relative z-10">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={editingGroup.name}
                                                    onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => handleUpdate(group.id, editingGroup.name)}
                                                    disabled={loading}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl disabled:opacity-50 flex items-center justify-center transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => setEditingGroup(null)}
                                                    className="bg-white/5 hover:bg-white/10 text-white px-4 rounded-xl transition-all border border-white/5 hover:border-white/10"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-5">
                                                <div className={clsx(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-300",
                                                    "bg-black/40 border-white/5 group-hover/card:border-indigo-500/30 group-hover/card:bg-indigo-500/10"
                                                )}>
                                                    <Layers className="w-7 h-7 text-gray-500 group-hover/card:text-indigo-400 transition-colors duration-300" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg transition-colors duration-300 text-white group-hover/card:text-indigo-100">
                                                        {group.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-300 bg-white/5 border-white/5 text-gray-400 group-hover/card:bg-indigo-500/10 group-hover/card:border-indigo-500/20 group-hover/card:text-indigo-300">
                                                            {group.members.length} conteneurs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {canManage && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/card:translate-x-0">
                                                <button
                                                    onClick={() => startEditing(group)}
                                                    className="p-2.5 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-300 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(group.id)}
                                                    className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-white/5 hover:border-red-500/30 transition-all"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {groups.length === 0 && !isCreating && (
                                <div className="flex flex-col items-center justify-center py-16 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/10 group hover:border-indigo-500/20 transition-colors">
                                    <div className="p-5 bg-black/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Layers className="w-10 h-10 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <h3 className="text-gray-300 font-bold text-lg">Aucun groupe</h3>
                                    <p className="text-gray-500 text-sm mt-1 max-w-[200px]">Commencez par créer un groupe pour organiser vos conteneurs.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer / Status */}
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
