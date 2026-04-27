'use client'

import { ContainerListView } from './ContainerListView'
import { ContainerGridView } from './ContainerGridView'
import type { ContainerCardProps } from './container-card-types'

export type { ContainerPermissions, ContainerCardProps } from './container-card-types'

/**
 * Carte d'un conteneur Docker. Route vers la variante correspondant au viewMode
 * (list view ou grid view) en transmettant l'integralite des callbacks.
 */
export function ContainerCard(props: ContainerCardProps) {
    if (props.viewMode === 'list') {
        return <ContainerListView {...props} />
    }
    return <ContainerGridView {...props} />
}
