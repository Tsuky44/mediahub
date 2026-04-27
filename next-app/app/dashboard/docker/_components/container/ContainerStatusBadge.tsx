'use client'

import clsx from 'clsx'
import type { DockerContainer } from '../../_types/docker'

interface ContainerStatusBadgeProps {
    container: DockerContainer
    variant: 'list' | 'grid'
}

/**
 * Badge d'etat (RUNNING/STOPPED). En variante 'list' affiche un petit point
 * pulsant et un coin arrondi, en variante 'grid' juste le label.
 */
export function ContainerStatusBadge({ container, variant }: ContainerStatusBadgeProps) {
    const isRunning = container.state === 'RUNNING'

    if (variant === 'list') {
        return (
            <span
                className={clsx(
                    'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all duration-500 flex items-center gap-1.5',
                    isRunning
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'text-gray-400 border-white/5 bg-white/5',
                )}
            >
                <div className={clsx('w-1.5 h-1.5 rounded-full', isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500')} />
                {container.state}
            </span>
        )
    }

    return (
        <span
            className={clsx(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-500',
                isRunning
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'text-gray-400 border-gray-700 bg-gray-800/50',
            )}
        >
            {container.state}
        </span>
    )
}
