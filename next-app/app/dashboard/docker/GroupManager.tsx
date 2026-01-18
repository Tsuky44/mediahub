
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
    containers: any[] // DockerContainer[]
    canManage?: boolean
    onClose: () => void
    onRefresh: () => void
}

export default function GroupManager({ groups, containers, onClose, onRefresh, canManage = false }: GroupManagerProps) {
    const [editingGroup, setEditingGroup] = useState<DockerGroup | null>(null)
    const [newGroupName, setNewGroupName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [selectedContainers, setSelectedContainers] = useState<string[]>([])
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

    const handleUpdate = async (groupId: string, name: string, members: string[]) => {
        if (loading) return
        setLoading(true)
        try {
            const res = await fetch(`/api/docker/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, members })
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
        setEditingGroup(group)
        setSelectedContainers(group.members.map(m => m.containerName))
    }

    const toggleContainerSelection = (name: string) => {
        setSelectedContainers(prev => 
            prev.includes(name) 
                ? prev.filter(n => n !== name)
                : [...prev, name]
        )
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900/95 border border-gray-700/50 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-800/50 flex items-center justify-between bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Layers className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Gestion des Groupes</h2>
                            <p className="text-xs text-gray-500 font-medium">Organisez vos conteneurs Docker</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Create New Group Section */}
                        {canManage && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                Nouveau groupe
                            </label>
                            {!isCreating ? (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full py-4 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-3 font-bold group"
                                >
                                    <div className="p-2 bg-gray-800 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    Créer un groupe de conteneurs
                                </button>
                            ) : (
                                <div className="p-1 bg-gray-800/40 rounded-2xl border border-gray-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex gap-2 p-1">
                                        <input
                                            type="text"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Nom du groupe..."
                                            className="flex-1 bg-gray-900 border-transparent rounded-xl px-4 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:bg-black/40 focus:ring-2 focus:ring-blue-500/50 transition-all"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                        />
                                        <button
                                            onClick={handleCreate}
                                            disabled={loading || !newGroupName.trim()}
                                            className="px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span>Créer</span>
                                        </button>
                                        <button
                                            onClick={() => setIsCreating(false)}
                                            className="px-4 hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 rounded-xl transition-all"
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
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                            Groupes Existants ({groups.length})
                        </label>
                        <div className="grid gap-4">
                            {groups.map(group => (
                                <div 
                                    key={group.id} 
                                    className={clsx(
                                        "group/card relative rounded-2xl transition-all duration-300",
                                        editingGroup?.id === group.id 
                                            ? "bg-gray-800/40 border border-blue-500/30 p-5 shadow-xl" 
                                            : "bg-gray-800/20 border border-gray-700/30 p-4 hover:border-gray-600 hover:bg-gray-800/40"
                                    )}
                                >
                                    {editingGroup?.id === group.id ? (
                                        <div className="space-y-5 animate-in fade-in duration-300">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={editingGroup.name}
                                                    onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                                                    className="flex-1 bg-gray-900/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                                />
                                                <button 
                                                    onClick={() => handleUpdate(group.id, editingGroup.name, selectedContainers)}
                                                    disabled={loading}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-xl disabled:opacity-50 flex items-center justify-center transition-all active:scale-95"
                                                >
                                                    {loading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => setEditingGroup(null)}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-xl transition-all"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                        Sélectionner les conteneurs
                                                    </label>
                                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                                        {selectedContainers.length} sélectionnés
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 bg-gray-900/60 rounded-xl border border-gray-800/50 custom-scrollbar">
                                                    {containers.map(container => (
                                                        <button
                                                            key={container.id}
                                                            onClick={() => toggleContainerSelection(container.name)}
                                                            className={clsx(
                                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border",
                                                                selectedContainers.includes(container.name)
                                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]"
                                                                    : "bg-gray-800/30 hover:bg-gray-800/60 text-gray-500 border-transparent"
                                                            )}
                                                        >
                                                            <div className={clsx(
                                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                                selectedContainers.includes(container.name)
                                                                    ? "bg-blue-500 border-blue-500 rotate-0 scale-100"
                                                                    : "border-gray-700 rotate-45 scale-90"
                                                            )}>
                                                                {selectedContainers.includes(container.name) && <Check className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <span className="truncate">{container.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gray-900/80 flex items-center justify-center border border-gray-700/50 group-hover/card:border-blue-500/30 transition-colors">
                                                    <Layers className="w-6 h-6 text-gray-600 group-hover/card:text-blue-400/70 transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-white group-hover/card:text-blue-400 transition-colors">{group.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-900 px-2 py-0.5 rounded-lg border border-gray-800">
                                                            {group.members.length} conteneurs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {canManage && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all translate-x-2 group-hover/card:translate-x-0">
                                                <button 
                                                    onClick={() => startEditing(group)}
                                                    className="p-2.5 hover:bg-blue-500/10 rounded-xl text-gray-500 hover:text-blue-400 transition-all"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(group.id)}
                                                    className="p-2.5 hover:bg-red-500/10 rounded-xl text-gray-500 hover:text-red-400 transition-all"
                                                    title="Supprimer"
                                                >
                                                    <Trash className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {groups.length === 0 && !isCreating && (
                                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-800/10 rounded-3xl border-2 border-dashed border-gray-800/50">
                                    <div className="p-4 bg-gray-800/50 rounded-2xl mb-4">
                                        <Layers className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <h3 className="text-gray-400 font-bold">Aucun groupe</h3>
                                    <p className="text-gray-600 text-xs mt-1 max-w-[200px]">Commencez par créer un groupe pour organiser vos conteneurs.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer / Status */}
                <div className="p-4 bg-gray-900/80 border-t border-gray-800/50 flex justify-center">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
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
