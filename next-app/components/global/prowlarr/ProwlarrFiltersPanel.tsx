'use client'

import { Filter, Clock, Film, Database } from 'lucide-react'
import { CATEGORIES } from './prowlarr-utils'
import type { ProwlarrIndexer } from './prowlarr-types'

interface ProwlarrFiltersPanelProps {
    selectedCategories: number[]
    onToggleCategory: (id: number) => void
    indexers: ProwlarrIndexer[]
    selectedIndexers: number[]
    onToggleIndexer: (id: number) => void
    showRecent: boolean
    onToggleRecent: () => void
    onReset: () => void
}

/** Panneau d'options : categories, indexeurs, RSS nouveautes. */
export function ProwlarrFiltersPanel({
    selectedCategories,
    onToggleCategory,
    indexers,
    selectedIndexers,
    onToggleIndexer,
    showRecent,
    onToggleRecent,
    onReset,
}: ProwlarrFiltersPanelProps) {
    const hasActiveFilters = selectedCategories.length > 0 || selectedIndexers.length > 0 || showRecent

    return (
        <div className="space-y-4 p-4 bg-gray-900/40 border border-white/5 rounded-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Filter className="h-4 w-4 text-indigo-400" />
                        Options de filtrage
                    </h3>
                    <button
                        onClick={onToggleRecent}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            showRecent
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <Clock className="h-3 w-3" />
                        Nouveautés (RSS)
                    </button>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={onReset}
                        className="text-[10px] text-gray-500 hover:text-indigo-400 font-bold uppercase tracking-wider transition-colors"
                    >
                        Réinitialiser
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <Film className="h-3 w-3" />
                        Catégories
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon
                            const isSelected = selectedCategories.includes(cat.id)
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => onToggleCategory(cat.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                        isSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {cat.name}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                        <Database className="h-3 w-3" />
                        Indexeurs
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        {indexers.length === 0 ? (
                            <p className="text-xs text-gray-600 italic">Chargement des indexeurs...</p>
                        ) : (
                            indexers.map(indexer => {
                                const isSelected = selectedIndexers.includes(indexer.id)
                                return (
                                    <button
                                        key={indexer.id}
                                        onClick={() => onToggleIndexer(indexer.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                            isSelected
                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                        }`}
                                    >
                                        {indexer.name}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
