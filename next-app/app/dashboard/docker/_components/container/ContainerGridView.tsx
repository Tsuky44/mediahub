'use client'

import clsx from 'clsx'
import { FileText, Terminal } from 'lucide-react'
import { ContainerIcon } from './ContainerIcon'
import { ContainerStatusBadge } from './ContainerStatusBadge'
import { ContainerGridDropdownMenu } from './ContainerGridDropdownMenu'
import type { ContainerCardProps } from './container-card-types'

/** Variante grid view de la carte conteneur (carte verticale avec dropdown menu). */
export function ContainerGridView(props: ContainerCardProps) {
    const {
        container,
        permissions,
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

    const { canManageGroups, canReadStats, canManageContainers, canReadLogs, canAccessConsole } = permissions
    const isRunning = container.state === 'RUNNING'

    return (
        <div
            draggable={canManageGroups}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => canReadStats && onSelectStats()}
            className={clsx(
                'bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 group relative flex flex-col h-full shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 cursor-pointer cursor-grab active:cursor-grabbing hover:z-30',
                isDragged && 'opacity-50',
                !canReadStats && 'cursor-default',
            )}
        >
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div
                    className={clsx(
                        'absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-all duration-500 blur-2xl opacity-0 group-hover:opacity-100',
                        isRunning ? 'opacity-100 scale-110' : 'opacity-0 scale-100',
                    )}
                />
            </div>

            <div className="flex justify-between items-start mb-5 relative z-20">
                <div className="flex items-center gap-4">
                    <ContainerIcon container={container} />
                    <div>
                        <h3
                            className="font-bold text-white text-lg leading-tight truncate max-w-[180px] group-hover:text-indigo-400 transition-colors"
                            title={container.name}
                        >
                            {container.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <ContainerStatusBadge container={container} variant="grid" />
                        </div>
                    </div>
                </div>

                {canManageContainers && (
                    <ContainerGridDropdownMenu
                        container={container}
                        permissions={permissions}
                        isMenuOpen={isMenuOpen}
                        onToggleMenu={onToggleMenu}
                        onCloseMenu={onCloseMenu}
                        onAction={onAction}
                        onShowLogs={onShowLogs}
                        onShowTerminal={onShowTerminal}
                        onShowDetails={onShowDetails}
                    />
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
