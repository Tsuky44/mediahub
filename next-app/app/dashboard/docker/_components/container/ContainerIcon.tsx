'use client'

import clsx from 'clsx'
import { Container } from 'lucide-react'
import type { DockerContainer } from '../../_types/docker'

interface ContainerIconProps {
    container: DockerContainer
}

/** Icone du conteneur (image custom ou Container par defaut) avec ring colore selon etat. */
export function ContainerIcon({ container }: ContainerIconProps) {
    const isRunning = container.state === 'RUNNING'
    return (
        <div
            className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-black/40 p-2.5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 border border-white/5',
                isRunning ? 'ring-1 ring-emerald-500/30 shadow-emerald-500/10' : 'ring-1 ring-white/10',
            )}
        >
            {container.icon ? (
                <img
                    loading="lazy"
                    decoding="async"
                    src={container.icon}
                    alt={container.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                />
            ) : (
                <Container className={clsx('w-7 h-7', isRunning ? 'text-emerald-400' : 'text-gray-400')} />
            )}
        </div>
    )
}
