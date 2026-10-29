'use client'

import { AlertTriangle } from 'lucide-react'
import type { DockerPortConflict } from '../../_types/docker'

interface DockerHealthBannerProps {
    portConflicts: DockerPortConflict[]
}

/**
 * Signale les ports réclamés par plusieurs conteneurs.
 *
 * Un conflit n'empêche pas forcément le démarrage — deux conteneurs sur des
 * réseaux différents peuvent exposer le même port interne — mais c'est la
 * première chose à regarder quand un conteneur refuse de démarrer.
 */
export function DockerHealthBanner({ portConflicts }: DockerHealthBannerProps) {
    if (portConflicts.length === 0) return null

    return (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1.5 min-w-0">
                <p className="text-sm font-semibold">
                    {portConflicts.length === 1
                        ? 'Un port est réclamé par plusieurs conteneurs'
                        : `${portConflicts.length} ports sont réclamés par plusieurs conteneurs`}
                </p>
                <ul className="space-y-1">
                    {portConflicts.map(conflict => (
                        <li key={`${conflict.privatePort}-${conflict.type}`} className="text-xs text-amber-200/80">
                            <span className="font-mono font-semibold text-amber-200">
                                {conflict.privatePort}/{conflict.type.toLowerCase()}
                            </span>
                            {' — '}
                            {conflict.containers.map(c => c.name).join(', ')}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
