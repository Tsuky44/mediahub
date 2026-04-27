'use client'

import { Layers, X } from 'lucide-react'

interface GroupManagerHeaderProps {
    onClose: () => void
}

export default function GroupManagerHeader({ onClose }: GroupManagerHeaderProps) {
    return (
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                    <Layers className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Gestion des Groupes
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">
                        Créez ou supprimez vos groupes de conteneurs
                    </p>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90 border border-transparent hover:border-white/10"
            >
                <X className="w-6 h-6" />
            </button>
        </div>
    )
}
