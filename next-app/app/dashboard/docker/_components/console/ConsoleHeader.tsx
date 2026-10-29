'use client'

import clsx from 'clsx'
import { ArrowUpCircle, Layers, Loader2, RefreshCw, ScanSearch, Search } from 'lucide-react'
import type {
    DockerDensity,
    DockerSortKey,
    DockerStateFilter,
} from '../../_types/docker'

interface ConsoleHeaderProps {
    stats: { total: number; running: number; stopped: number; groups: number }
    updatableCount: number
    conflictCount: number

    searchQuery: string
    onSearchQueryChange: (value: string) => void
    stateFilter: DockerStateFilter
    onStateFilterChange: (filter: DockerStateFilter) => void
    sort: DockerSortKey
    onSortChange: (sort: DockerSortKey) => void
    density: DockerDensity
    onDensityChange: (density: DockerDensity) => void

    refreshing: boolean
    isCheckingUpdates: boolean
    isUpdatingAll: boolean
    canManageGroups: boolean
    canManageContainers: boolean
    onRefresh: () => void
    onCheckUpdates: () => void
    onUpdateAll: () => void
    onOpenGroupManager: () => void
}

const FILTERS: { key: DockerStateFilter; label: string }[] = [
    { key: 'all', label: 'tous' },
    { key: 'running', label: 'actifs' },
    { key: 'stopped', label: 'arrêtés' },
]

const SORTS: { key: DockerSortKey; label: string }[] = [
    { key: 'name', label: 'nom' },
    { key: 'state', label: 'état' },
    { key: 'update', label: 'màj' },
]

/**
 * En-tête de la vue console.
 *
 * Là où le thème classique consacre quatre grandes cartes aux compteurs, on
 * les réduit ici à une ligne de statut. Sur une page dont l'intérêt est la
 * liste elle-même, ces quatre nombres n'ont pas à occuper le premier écran :
 * ils informent, ils ne se consultent pas.
 */
export function ConsoleHeader({
    stats,
    updatableCount,
    conflictCount,
    searchQuery,
    onSearchQueryChange,
    stateFilter,
    onStateFilterChange,
    sort,
    onSortChange,
    density,
    onDensityChange,
    refreshing,
    isCheckingUpdates,
    isUpdatingAll,
    canManageGroups,
    canManageContainers,
    onRefresh,
    onCheckUpdates,
    onUpdateAll,
    onOpenGroupManager,
}: ConsoleHeaderProps) {
    const chip = (active: boolean) =>
        clsx(
            'font-mono text-[11px] px-2 py-1 rounded transition-colors lowercase',
            active
                ? 'bg-white/[0.07] text-[--color-gray-100]'
                : 'text-[--color-gray-500] hover:text-[--color-gray-300]',
        )

    const tool =
        'p-1.5 rounded text-[--color-gray-500] hover:text-[--color-gray-100] hover:bg-white/[0.06] transition-colors disabled:opacity-30'

    return (
        <header className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-mono text-[13px] uppercase tracking-[0.25em] text-[--color-gray-300]">
                    docker
                </h1>

                {/* Ligne de statut : tout l'état de la stack en une phrase lisible. */}
                <p className="font-mono text-[11px] text-[--color-gray-500] tabular-nums">
                    {stats.total} conteneurs
                    <span className="text-[--color-gray-700] mx-2">·</span>
                    <span className="text-emerald-400/80">{stats.running} actifs</span>
                    <span className="text-[--color-gray-700] mx-2">·</span>
                    {stats.stopped} arrêtés
                    <span className="text-[--color-gray-700] mx-2">·</span>
                    {stats.groups} groupes
                    {updatableCount > 0 && (
                        <>
                            <span className="text-[--color-gray-700] mx-2">·</span>
                            <span className="text-amber-400/90">{updatableCount} à mettre à jour</span>
                        </>
                    )}
                    {conflictCount > 0 && (
                        <>
                            <span className="text-[--color-gray-700] mx-2">·</span>
                            <span className="text-amber-400/90">
                                {conflictCount} conflit{conflictCount > 1 ? 's' : ''} de port
                            </span>
                        </>
                    )}
                </p>

                <div className="ml-auto flex items-center gap-0.5">
                    {canManageContainers && updatableCount > 0 && (
                        <button
                            onClick={onUpdateAll}
                            disabled={isUpdatingAll}
                            className={`${tool} text-amber-400/90 hover:text-amber-300`}
                            title={`Mettre à jour les ${updatableCount} conteneurs obsolètes`}
                        >
                            {isUpdatingAll ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowUpCircle className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    {canManageContainers && (
                        <button
                            onClick={onCheckUpdates}
                            disabled={isCheckingUpdates}
                            className={tool}
                            title="Réinterroger les registres"
                        >
                            {isCheckingUpdates ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ScanSearch className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    {canManageGroups && (
                        <button onClick={onOpenGroupManager} className={tool} title="Gérer les groupes">
                            <Layers className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={onRefresh} disabled={refreshing} className={tool} title="Rafraîchir">
                        <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap border-y border-white/[0.05] py-1.5">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--color-gray-600]" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={e => onSearchQueryChange(e.target.value)}
                        placeholder="filtrer…"
                        aria-label="Filtrer les conteneurs"
                        className="w-full bg-transparent border-0 pl-7 pr-2 py-1 font-mono text-[12px] text-[--color-gray-100] placeholder:text-[--color-gray-600] focus:outline-none focus:ring-0"
                    />
                </div>

                <div className="flex items-center gap-0.5">
                    {FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => onStateFilterChange(key)}
                            className={chip(stateFilter === key)}
                            aria-pressed={stateFilter === key}
                        >
                            {label}
                        </button>
                    ))}
                    {updatableCount > 0 && (
                        <button
                            onClick={() => onStateFilterChange('updates')}
                            className={chip(stateFilter === 'updates')}
                            aria-pressed={stateFilter === 'updates'}
                        >
                            màj
                        </button>
                    )}
                </div>

                <span aria-hidden className="w-px h-3.5 bg-white/[0.07]" />

                <div className="flex items-center gap-0.5">
                    <span className="font-mono text-[10px] text-[--color-gray-600] mr-1">tri</span>
                    {SORTS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => onSortChange(key)}
                            className={chip(sort === key)}
                            aria-pressed={sort === key}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <span aria-hidden className="w-px h-3.5 bg-white/[0.07]" />

                <button
                    onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
                    className={chip(density === 'compact')}
                    aria-pressed={density === 'compact'}
                    title="Densité d'affichage"
                >
                    dense
                </button>
            </div>
        </header>
    )
}
