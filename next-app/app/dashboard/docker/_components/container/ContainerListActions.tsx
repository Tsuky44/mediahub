'use client'

import { Loader2, Square, RotateCw, Play, FileText, Terminal, Box } from 'lucide-react'
import type { DockerContainer, DockerAction } from '../../_types/docker'
import type { ContainerPermissions } from './container-card-types'

interface ContainerListActionsProps {
    container: DockerContainer
    permissions: ContainerPermissions
    isActionLoading: boolean
    onAction: (containerRef: string, action: DockerAction) => void
    onShowLogs: () => void
    onShowTerminal: () => void
    onShowDetails: () => void
}

/**
 * Boutons d'action inline reveles au hover dans la list view.
 * Stop/Restart si en marche, Start si arrete, plus Logs/Console/Config selon perms.
 */
export function ContainerListActions({
    container,
    permissions,
    isActionLoading,
    onAction,
    onShowLogs,
    onShowTerminal,
    onShowDetails,
}: ContainerListActionsProps) {
    const { canManageContainers, canAccessConsole, canReadDetails, canReadLogs } = permissions
    const isRunning = container.state === 'RUNNING'

    return (
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
            ) : canManageContainers ? (
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
            )}
        </div>
    )
}
