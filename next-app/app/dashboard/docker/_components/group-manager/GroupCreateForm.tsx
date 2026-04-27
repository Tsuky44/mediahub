'use client'

import { Loader2, Plus, Save, X } from 'lucide-react'

interface GroupCreateFormProps {
    isCreating: boolean
    newGroupName: string
    isLoading: boolean
    onNameChange: (value: string) => void
    onStart: () => void
    onSubmit: () => void
    onCancel: () => void
}

export default function GroupCreateForm({
    isCreating,
    newGroupName,
    isLoading,
    onNameChange,
    onStart,
    onSubmit,
    onCancel,
}: GroupCreateFormProps) {
    if (!isCreating) {
        return (
            <button
                onClick={onStart}
                className="w-full py-5 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-3 font-bold group duration-300"
            >
                <div className="p-2 bg-white/5 rounded-xl group-hover:bg-indigo-500/20 transition-colors duration-300">
                    <Plus className="w-5 h-5" />
                </div>
                Créer un groupe de conteneurs
            </button>
        )
    }

    return (
        <div className="p-1.5 bg-black/40 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl">
            <div className="flex gap-2 p-1">
                <input
                    type="text"
                    value={newGroupName}
                    onChange={e => onNameChange(e.target.value)}
                    placeholder="Nom du groupe..."
                    className="flex-1 bg-white/5 border-transparent rounded-xl px-4 py-3 text-white font-bold placeholder-gray-500 focus:outline-none focus:bg-black/40 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && onSubmit()}
                />
                <button
                    onClick={onSubmit}
                    disabled={isLoading || !newGroupName.trim()}
                    className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 hover:scale-105"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    <span>Créer</span>
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all hover:rotate-90 duration-300"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
        </div>
    )
}
