'use client'

import { Box, FileText, Play, RotateCw, Settings as SettingsIcon, Square, Terminal } from 'lucide-react'
import type { DockerContainer, DockerAction } from '../../_types/docker'
import type { ContainerPermissions } from './container-card-types'

interface ContainerGridDropdownMenuProps {
    container: DockerContainer
    permissions: ContainerPermissions
    isMenuOpen: boolean
    onToggleMenu: (e: React.MouseEvent) => void
    onCloseMenu: () => void
    onAction: (containerRef: string, action: DockerAction) => void
    onShowLogs: () => void
    onShowTerminal: () => void
    onShowDetails: () => void
}

/** Bouton roue cranter + dropdown d'actions pour la grid view. */
export function ContainerGridDropdownMenu({
    container,
    permissions,
    isMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onAction,
    onShowLogs,
    onShowTerminal,
    onShowDetails,
}: ContainerGridDropdownMenuProps) {
    const { canAccessConsole, canReadDetails, canReadLogs } = permissions
    const isRunning = container.state === 'RUNNING'
    const showSeparator = canReadLogs || canAccessConsole || canReadDetails

    return (
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

                        {showSeparator && <div className="h-px bg-white/5 my-1" />}

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
    )
}
