import type { Permission } from '../_types/permission'

/** Verifie si la permission (subject, action) est presente. */
export function hasPermission(permissions: Permission[], subject: string, action: string): boolean {
    return permissions.some(p => p.subject === subject && p.action === action)
}

/**
 * Toggle la permission (subject, action) en respectant des implications auto :
 * - Cocher une permission de "demander" implique Media/read
 * - Cocher Downloads/manage implique Downloads/read
 */
export function togglePermissionWithImplications(
    permissions: Permission[],
    subject: string,
    action: string
): Permission[] {
    const exists = permissions.find(p => p.subject === subject && p.action === action)

    if (exists) {
        return permissions.filter(p => !(p.subject === subject && p.action === action))
    }

    const next = [...permissions, { subject, action }]

    // Auto-check Media/read when a "Demander" permission is toggled on
    const mediaImpliesRead =
        (subject === 'MediaRequest' && action === 'create') ||
        (subject === 'Media' && ['interactive_search', 'trigger_search', 'manage_settings'].includes(action))
    if (mediaImpliesRead && !hasPermission(next, 'Media', 'read')) {
        next.push({ subject: 'Media', action: 'read' })
    }

    // Auto-check Downloads/read when Downloads/manage is toggled on
    if (subject === 'Downloads' && action === 'manage' && !hasPermission(next, 'Downloads', 'read')) {
        next.push({ subject: 'Downloads', action: 'read' })
    }

    return next
}

/**
 * Toggle special pour MediaRequest "sync/manage" qui coche l'un OU l'autre
 * (plusieurs actions possibles pour le meme concept utilisateur).
 */
export function toggleMediaRequestSyncOrManage(permissions: Permission[]): Permission[] {
    const hasSyncOrManage = permissions.some(
        p => p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage')
    )
    if (hasSyncOrManage) {
        return permissions.filter(
            p => !(p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage'))
        )
    }
    return [...permissions, { subject: 'MediaRequest', action: 'sync' }]
}

export function hasMediaRequestSyncOrManage(permissions: Permission[]): boolean {
    return permissions.some(
        p => p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage')
    )
}
