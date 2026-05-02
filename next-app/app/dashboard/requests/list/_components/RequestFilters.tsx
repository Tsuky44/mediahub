'use client'

import type { ReactNode } from 'react'
import { Film, Search, Tv, User, Users, X } from 'lucide-react'

export type MediaTypeFilter = 'all' | 'movie' | 'tv'
export type OwnershipFilter = 'all' | 'mine' | 'others'

interface RequestFiltersProps {
    mediaType: MediaTypeFilter
    ownership: OwnershipFilter
    searchQuery: string
    activeCount: number
    onMediaTypeChange: (v: MediaTypeFilter) => void
    onOwnershipChange: (v: OwnershipFilter) => void
    onSearchChange: (v: string) => void
    onClearFilters: () => void
}

const mediaTypeOptions: { value: MediaTypeFilter; label: string; icon: typeof Film }[] = [
    { value: 'all', label: 'Tous', icon: Film },
    { value: 'movie', label: 'Films', icon: Film },
    { value: 'tv', label: 'Séries', icon: Tv },
]

const ownershipOptions: { value: OwnershipFilter; label: string; icon: typeof User }[] = [
    { value: 'all', label: 'Toutes', icon: Users },
    { value: 'mine', label: 'Perso', icon: User },
    { value: 'others', label: 'Autres', icon: Users },
]

export function RequestFilters({
    mediaType,
    ownership,
    searchQuery,
    activeCount,
    onMediaTypeChange,
    onOwnershipChange,
    onSearchChange,
    onClearFilters,
}: RequestFiltersProps) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
                <FilterPillGroup
                    options={mediaTypeOptions}
                    value={mediaType}
                    onChange={onMediaTypeChange}
                />
                <FilterPillGroup
                    options={ownershipOptions}
                    value={ownership}
                    onChange={onOwnershipChange}
                />
                {activeCount > 0 && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Réinitialiser ({activeCount})
                    </button>
                )}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Rechercher une demande..."
                    className="w-full lg:w-64 pl-9 pr-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    )
}

// --- Local sub-component ----------------------------------------------------

interface FilterPillOption<T extends string> {
    value: T
    label: string
    icon: (props: { className?: string }) => ReactNode
}

interface FilterPillGroupProps<T extends string> {
    options: FilterPillOption<T>[]
    value: T
    onChange: (v: T) => void
}

function FilterPillGroup<T extends string>({ options, value, onChange }: FilterPillGroupProps<T>) {
    return (
        <div className="flex items-center gap-1 bg-zinc-900/60 rounded-xl p-1 border border-zinc-800">
            {options.map((opt) => {
                const Icon = opt.icon
                const active = value === opt.value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            active
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}
