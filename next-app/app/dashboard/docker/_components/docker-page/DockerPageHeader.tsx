'use client'

import clsx from 'clsx'
import { Container, Layers, RefreshCw } from 'lucide-react'

interface DockerPageHeaderProps {
    refreshing: boolean
    canManageGroups: boolean
    onRefresh: () => void
    onOpenGroupManager: () => void
}

export default function DockerPageHeader({
    refreshing,
    canManageGroups,
    onRefresh,
    onOpenGroupManager,
}: DockerPageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
                        <Container className="w-7 h-7 text-indigo-400" />
                    </div>
                    Gestion Docker
                </h1>
                <p className="text-gray-400 mt-2 text-sm font-medium ml-1">
                    Gérez et surveillez vos conteneurs Unraid en temps réel
                </p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="p-3 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-white/5 hover:border-white/10 transition-all active:scale-95 disabled:opacity-50"
                    title="Rafraîchir"
                >
                    <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
                </button>
                {canManageGroups && (
                    <button
                        onClick={onOpenGroupManager}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        <Layers className="w-5 h-5" />
                        <span className="hidden sm:inline">Gérer les Groupes</span>
                    </button>
                )}
            </div>
        </div>
    )
}
