'use client'

import clsx from 'clsx'
import { Activity, Server } from 'lucide-react'
import { ContainerIcon } from './ContainerIcon'
import { ContainerStatusBadge } from './ContainerStatusBadge'
import { ContainerListActions } from './ContainerListActions'
import type { ContainerCardProps } from './container-card-types'

/** Variante list view de la carte conteneur (ligne horizontale avec actions inline). */
export function ContainerListView(props: ContainerCardProps) {
    const {
        container,
        permissions,
        isActionLoading,
        isDragged,
        onDragStart,
        onDragEnd,
        onSelectStats,
        onShowLogs,
        onShowTerminal,
        onShowDetails,
        onAction,
    } = props

    const { canManageGroups, canReadStats } = permissions
    const isRunning = container.state === 'RUNNING'

    return (
        <div
            draggable={canManageGroups}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => canReadStats && onSelectStats()}
            className={clsx(
                'bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-4 hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300 flex items-center gap-5 group relative overflow-hidden cursor-pointer cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-indigo-500/10',
                isDragged && 'opacity-50',
                !canReadStats && 'cursor-default',
            )}
        >
            <div
                className={clsx(
                    'absolute left-0 top-0 bottom-0 w-1 transition-all duration-300',
                    isRunning
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'bg-white/10',
                )}
            />

            <ContainerIcon container={container} />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                    <h3
                        className="font-bold text-white text-lg leading-tight truncate group-hover:text-indigo-400 transition-colors"
                        title={container.name}
                    >
                        {container.name}
                    </h3>
                    <ContainerStatusBadge container={container} variant="list" />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                    <span
                        className="flex items-center gap-1.5 truncate max-w-[200px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5"
                        title={container.image}
                    >
                        <Activity className="w-3.5 h-3.5 text-indigo-400" /> {container.image.split(':')[0]}
                    </span>
                    {container.ports && (
                        <span
                            className="flex items-center gap-1.5 truncate max-w-[300px] font-mono text-gray-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/5"
                            title={container.ports}
                        >
                            <Server className="w-3.5 h-3.5" /> {container.ports}
                        </span>
                    )}
                </div>
            </div>

            <ContainerListActions
                container={container}
                permissions={permissions}
                isActionLoading={isActionLoading}
                onAction={onAction}
                onShowLogs={onShowLogs}
                onShowTerminal={onShowTerminal}
                onShowDetails={onShowDetails}
            />
        </div>
    )
}
