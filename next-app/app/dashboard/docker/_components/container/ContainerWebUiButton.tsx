'use client'

import { ExternalLink } from 'lucide-react'
import type { DockerContainer } from '../../_types/docker'

interface ContainerWebUiButtonProps {
    container: DockerContainer
}

/**
 * Ouvre l'interface web du conteneur dans un nouvel onglet.
 *
 * L'URL vient du template Unraid (`webUiUrl`) : elle n'existe donc pas pour
 * les conteneurs sans template, ni via le socket Docker seul. Dans ce cas on
 * n'affiche rien plutôt qu'un bouton qui ne mènerait nulle part.
 */
export function ContainerWebUiButton({ container }: ContainerWebUiButtonProps) {
    if (!container.webUiUrl || container.state !== 'RUNNING') return null

    return (
        <a
            href={container.webUiUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 hover:border-sky-500/40 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-sky-500/10"
            title={`Ouvrir ${container.name} (${container.webUiUrl})`}
        >
            <ExternalLink className="w-4 h-4" />
        </a>
    )
}
