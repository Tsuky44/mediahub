'use client'

import { ArrowUpCircle, Unlink } from 'lucide-react'
import type { DockerContainer } from '../../_types/docker'

interface ContainerUpdateBadgeProps {
    container: DockerContainer
}

/**
 * Signale qu'une nouvelle image est disponible, ou que le conteneur n'a plus
 * de template Unraid.
 *
 * `UNKNOWN` n'est volontairement pas affiché : Unraid renvoie ce statut pour
 * toute image dont il n'a pas pu interroger le registre, ce qui est banal et
 * ne demande aucune action.
 */
export function ContainerUpdateBadge({ container }: ContainerUpdateBadgeProps) {
    const needsUpdate =
        container.updateStatus === 'UPDATE_AVAILABLE' || container.updateStatus === 'REBUILD_READY'

    if (!needsUpdate && !container.isOrphaned) return null

    if (needsUpdate) {
        const label = container.updateStatus === 'REBUILD_READY' ? 'À reconstruire' : 'Màj dispo'
        return (
            <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold uppercase tracking-wide"
                title="Une nouvelle image est disponible pour ce conteneur"
            >
                <ArrowUpCircle className="w-3 h-3" />
                {label}
            </span>
        )
    }

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 text-[10px] font-bold uppercase tracking-wide"
            title="Ce conteneur n'a plus de template Unraid associé"
        >
            <Unlink className="w-3 h-3" />
            Orphelin
        </span>
    )
}
