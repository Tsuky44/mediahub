'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, X, RotateCcw, ArrowUpDown, Signal, Tag, Calendar, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface SortOption {
    id: string
    label: string
}

interface FilterModalProps {
    isOpen: boolean
    onClose: () => void
    sortBy: string
    onSortByChange: (id: string) => void
    sortOptions: SortOption[]
    trackers: string[]
    selectedTrackers: string[]
    onSelectedTrackersChange: (next: string[]) => void
    tags: string[]
    selectedTags: string[]
    onSelectedTagsChange: (next: string[]) => void
    dateFrom: string
    onDateFromChange: (value: string) => void
    onReset: () => void
}

export function FilterModal({
    isOpen,
    onClose,
    sortBy,
    onSortByChange,
    sortOptions,
    trackers,
    selectedTrackers,
    onSelectedTrackersChange,
    tags,
    selectedTags,
    onSelectedTagsChange,
    dateFrom,
    onDateFromChange,
    onReset,
}: FilterModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    if (!mounted || !isOpen) return null

    const toggleTracker = (tracker: string) => {
        onSelectedTrackersChange(
            selectedTrackers.includes(tracker)
                ? selectedTrackers.filter(t => t !== tracker)
                : [...selectedTrackers, tracker]
        )
    }

    const toggleTag = (tag: string) => {
        onSelectedTagsChange(
            selectedTags.includes(tag)
                ? selectedTags.filter(t => t !== tag)
                : [...selectedTags, tag]
        )
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-[#0A0A0A]/95 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Filter className="h-5 w-5 text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight">Filtres avancés</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[2px] text-gray-500">Configuration des filtres</span>
                        <button
                            onClick={onReset}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Réinitialiser tout
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Sort Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                <ArrowUpDown className="h-4 w-4 text-indigo-400" />
                                Trier par
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-2 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {sortOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => onSortByChange(option.id)}
                                        className={clsx(
                                            "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all mb-1",
                                            sortBy === option.id
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Trackers Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                    <Signal className="h-4 w-4 text-indigo-400" />
                                    Trackers
                                </div>
                                <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    {selectedTrackers.length} sélectionné
                                </span>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <div className="grid grid-cols-1 gap-2">
                                    {trackers.map((tracker) => (
                                        <button
                                            key={tracker}
                                            onClick={() => toggleTracker(tracker)}
                                            className={clsx(
                                                "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                                                selectedTrackers.includes(tracker)
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                                                    : "bg-transparent text-gray-400 border-white/5 hover:border-white/10 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate">{tracker}</span>
                                            <div className={clsx(
                                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                selectedTrackers.includes(tracker)
                                                    ? "bg-indigo-500 border-indigo-500"
                                                    : "border-white/20"
                                            )}>
                                                {selectedTrackers.includes(tracker) && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                        </button>
                                    ))}
                                    {trackers.length === 0 && (
                                        <div className="text-center py-12 text-gray-500 text-xs italic flex flex-col items-center gap-2">
                                            <Signal className="w-8 h-8 opacity-20" />
                                            Aucun tracker disponible
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                    <Tag className="h-4 w-4 text-indigo-400" />
                                    Tags
                                </div>
                                <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                                    {selectedTags.length} sélectionné
                                </span>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <div className="grid grid-cols-1 gap-2">
                                    {tags.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={clsx(
                                                "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                                                selectedTags.includes(tag)
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                                                    : "bg-transparent text-gray-400 border-white/5 hover:border-white/10 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate">{tag}</span>
                                            <div className={clsx(
                                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                selectedTags.includes(tag)
                                                    ? "bg-indigo-500 border-indigo-500"
                                                    : "border-white/20"
                                            )}>
                                                {selectedTags.includes(tag) && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                        </button>
                                    ))}
                                    {tags.length === 0 && (
                                        <div className="text-center py-12 text-gray-500 text-xs italic flex flex-col items-center gap-2">
                                            <Tag className="w-8 h-8 opacity-20" />
                                            Aucun tag disponible
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Period Section */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                                    <Calendar className="h-4 w-4 text-indigo-400" />
                                    Période
                                </div>
                                <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">À partir de</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => onDateFromChange(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end bg-white/5">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        Voir les résultats
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
