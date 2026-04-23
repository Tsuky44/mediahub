'use client'

import clsx from 'clsx'
import { Container, Activity, Server, Loader2, Square, RotateCw, Play, FileText, Terminal, Box, Settings as SettingsIcon } from 'lucide-react'
import type { DockerContainer, DockerViewMode, DockerAction } from '../../_types/docker'

export interface ContainerPermissions {
    canManageContainers: boolean
    canAccessConsole: boolean
    canReadDetails: boolean
    canReadLogs: boolean
    canReadStats: boolean
    canManageGroups: boolean
}

interface ContainerCardProps {
    container: DockerContainer
    viewMode: DockerViewMode
    permissions: ContainerPermissions
    isActionLoading: boolean
    isDragged: boolean
    isMenuOpen: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragEnd: () => void
    onSelectStats: () => void
    onToggleMenu: (e: React.MouseEvent) => void
    onCloseMenu: () => void
    onShowLogs: () => void
    onShowTerminal: () => void
    onShowDetails: () => void
    /** containerRef est soit l'id (list view) soit le nom (grid menu) pour preserver le comportement d'origine. */
    onAction: (containerRef: string, action: DockerAction) => void
}

/** Icone ou placeholder pour le conteneur (partagee entre grid/list). */
function ContainerIcon({ container, compact = false }: { container: DockerContainer; compact?: boolean }) {
    const size = compact ? 'w-7 h-7' : 'w-7 h-7'
    return (
        <div className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-black/40 p-2.5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 border border-white/5',
            container.state === 'RUNNING' ? 'ring-1 ring-emerald-500/30 shadow-emerald-500/10' : 'ring-1 ring-white/10'
        )}>
            {container.icon ? (
                <img
                    src={container.icon}
                    alt={container.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
            ) : (
                <Container className={clsx(size, container.state === 'RUNNING' ? 'text-emerald-400' : 'text-gray-400')} />
            )}
        </div>
    )
}

/**
 * Carte d'un conteneur Docker. Supporte deux variantes (grid, list) avec
 * les bons actions/menus selon les permissions.
 */
export function ContainerCard(props: ContainerCardProps) {
    const {
        container,
        viewMode,
        permissions,
        isActionLoading,
        isDragged,
        isMenuOpen,
        onDragStart,
        onDragEnd,
        onSelectStats,
        onToggleMenu,
        onCloseMenu,
        onShowLogs,
        onShowTerminal,
        onShowDetails,
        onAction,
    } = props

    const { canManageContainers, canAccessConsole, canReadDetails, canReadLogs, canReadStats, canManageGroups } = permissions
    const isRunning = container.state === 'RUNNING'

    const commonProps = {
        draggable: canManageGroups,
        onDragStart,
        onDragEnd,
        onClick: () => canReadStats && onSelectStats(),
    }

    if (viewMode === 'list') {
        return (
            <div
                key={container.id}
                {...commonProps}
                className={clsx(
                    'bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-4 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 flex items-center gap-5 group relative overflow-hidden cursor-pointer cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-indigo-500/10',
                    isDragged && 'opacity-50',
                    !canReadStats && 'cursor-default'
                )}
            >
                <div className={clsx(
                    'absolute left-0 top-0 bottom-0 w-1 transition-all duration-300',
                    isRunning ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/10'
                )} />

                <ContainerIcon container={container} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-indigo-400 transition-colors" title={container.name}>
                            {container.name}
                        </h3>
                        <span className={clsx(
                            'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all duration-500 flex items-center gap-1.5',
                            isRunning
                                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                : 'text-gray-400 border-white/5 bg-white/5'
                        )}>
                            <div className={clsx('w-1.5 h-1.5 rounded-full', isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500')} />
                            {container.state}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5" title={container.image}>
                            <Activity className="w-3.5 h-3.5 text-indigo-400" /> {container.image.split(':')[0]}
                        </span>
                        {container.ports && (
                            <span className="flex items-center gap-1.5 truncate max-w-[300px] font-mono text-gray-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/5" title={container.ports}>
                                <Server className="w-3.5 h-3.5" /> {container.ports}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions (inline, revealed on hover) */}
                <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    {isRunning ? (
                        <>
                            {canManageContainers && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction(container.id, 'stop') }}
                                        disabled={isActionLoading}
                                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/10"
                                        title="Arrêter"
                                    >
                                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-current" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction(container.id, 'restart') }}
                                        className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 hover:text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-indigo-500/10"
                                        title="Redémarrer"
                                    >
                                        <RotateCw className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            {canReadLogs && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShowLogs() }}
                                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-amber-500/10"
                                    title="Logs"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                            )}
                            {canAccessConsole && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShowTerminal() }}
                                    className="p-2.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-400 hover:text-zinc-200 border border-zinc-500/20 hover:border-zinc-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-zinc-500/10"
                                    title="Console"
                                >
                                    <Terminal className="w-4 h-4" />
                                </button>
                            )}
                            {canReadDetails && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShowDetails() }}
                                    className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/10"
                                    title="Configuration"
                                >
                                    <Box className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        canManageContainers ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction(container.id, 'start') }}
                                disabled={isActionLoading}
                                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-emerald-500/10"
                                title="Démarrer"
                            >
                                {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500 italic px-2 font-medium">Arrêté</span>
                        )
                    )}
                </div>
            </div>
        )
    }

    // Grid view
    return (
        <div
            key={container.id}
            {...commonProps}
            className={clsx(
                'bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 group relative flex flex-col h-full shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 cursor-pointer cursor-grab active:cursor-grabbing hover:z-30',
                isDragged && 'opacity-50',
                !canReadStats && 'cursor-default'
            )}
        >
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className={clsx(
                    'absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-all duration-500 blur-2xl opacity-0 group-hover:opacity-100',
                    isRunning ? 'opacity-100 scale-110' : 'opacity-0 scale-100'
                )} />
            </div>

            <div className="flex justify-between items-start mb-5 relative z-20">
                <div className="flex items-center gap-4">
                    <ContainerIcon container={container} />
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight truncate max-w-[180px] group-hover:text-indigo-400 transition-colors" title={container.name}>
                            {container.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={clsx(
                                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-500',
                                isRunning
                                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                    : 'text-gray-400 border-gray-700 bg-gray-800/50'
                            )}>
                                {container.state}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions Menu */}
                {canManageContainers && (
                    <div className="relative">
                        <button
                            onClick={onToggleMenu}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <SettingsIcon className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-1 space-y-0.5">
                                    {isRunning ? (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAction(container.name, 'restart') }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-indigo-500/20 rounded-xl transition-colors"
                                            >
                                                <RotateCw className="w-4 h-4 text-indigo-400" /> Redémarrer
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAction(container.name, 'stop') }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
                                            >
                                                <Square className="w-4 h-4 text-red-400 fill-current" /> Arrêter
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(container.name, 'start') }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-colors"
                                        >
                                            <Play className="w-4 h-4 text-emerald-400 fill-current" /> Démarrer
                                        </button>
                                    )}

                                    {(canReadLogs || canAccessConsole || canReadDetails) && <div className="h-px bg-white/5 my-1" />}

                                    {canReadLogs && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCloseMenu(); onShowLogs() }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-amber-500/20 rounded-xl transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-amber-400" /> Logs
                                        </button>
                                    )}
                                    {canAccessConsole && isRunning && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCloseMenu(); onShowTerminal() }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-zinc-500/20 rounded-xl transition-colors"
                                        >
                                            <Terminal className="w-4 h-4 text-zinc-400" /> Console
                                        </button>
                                    )}
                                    {canReadDetails && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCloseMenu(); onShowDetails() }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-500/20 rounded-xl transition-colors"
                                        >
                                            <Box className="w-4 h-4 text-blue-400" /> Configuration
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-3 relative z-10">
                <div className="p-3 rounded-xl bg-gray-950/30 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Image</span>
                        <span className="text-gray-300 font-mono truncate max-w-[150px]" title={container.image}>
                            {container.image.split(':')[0]}
                        </span>
                    </div>
                    {container.ports && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-medium">Ports</span>
                            <span className="text-gray-300 font-mono truncate max-w-[150px]" title={container.ports}>
                                {container.ports}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions (Hover) */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-2">
                    {isRunning && canReadLogs && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onShowLogs() }}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            title="Logs Rapides"
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {isRunning && canAccessConsole && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onShowTerminal() }}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                            title="Console Rapide"
                        >
                            <Terminal className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {isRunning ? (
                    <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Opérationnel
                    </span>
                ) : (
                    <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        Stoppé
                    </span>
                )}
            </div>
        </div>
    )
}
