'use client'

import type { Permission, PermissionTabDef, PermissionGroupDef } from '../../_types/permission'
import { hasPermission, hasMediaRequestSyncOrManage } from '../../_utils/role-permissions'
import { PermissionRow } from './PermissionRow'
import { PermissionCheckbox } from './PermissionCheckbox'

interface RolePermissionsPanelProps {
    tab: PermissionTabDef
    permissions: Permission[]
    onToggle: (subject: string, action: string) => void
    onToggleMediaRequestSync: () => void
}

function renderGroupContent(
    group: PermissionGroupDef,
    permissions: Permission[],
    onToggle: (subject: string, action: string) => void
) {
    if (group.style === 'row') {
        return (
            <div className="space-y-4">
                {group.permissions.map(p => (
                    <PermissionRow
                        key={`${p.subject}:${p.action}`}
                        label={p.label}
                        description={p.description}
                        checked={hasPermission(permissions, p.subject, p.action)}
                        onChange={() => onToggle(p.subject, p.action)}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {group.permissions.map(p => (
                <PermissionCheckbox
                    key={`${p.subject}:${p.action}`}
                    label={p.label}
                    description={p.description}
                    danger={p.danger}
                    checked={hasPermission(permissions, p.subject, p.action)}
                    onChange={() => onToggle(p.subject, p.action)}
                />
            ))}
        </div>
    )
}

/**
 * Panel generique qui rend les permissions d'un tab selon sa configuration.
 * Gere le cas special du toggle MediaRequest/sync|manage pour le tab my_requests.
 */
export function RolePermissionsPanel({
    tab,
    permissions,
    onToggle,
    onToggleMediaRequestSync,
}: RolePermissionsPanelProps) {
    const showHeading = !['dashboard', 'requests', 'my_requests', 'media'].includes(tab.id)

    return (
        <div className={`space-y-4 ${showHeading ? 'animate-in fade-in slide-in-from-left-4 duration-300' : ''}`}>
            {showHeading ? (
                <h3 className="text-lg font-semibold text-white mb-4">{tab.heading}</h3>
            ) : (
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{tab.heading}</h4>
            )}

            {tab.groups.map((group, groupIndex) => (
                <div key={groupIndex} className={group.title ? 'mb-6' : undefined}>
                    {group.title && (
                        <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">{group.title}</h4>
                    )}
                    {renderGroupContent(group, permissions, onToggle)}
                </div>
            ))}

            {/* Special case: MediaRequest sync OR manage toggle */}
            {tab.id === 'my_requests' && (
                <PermissionRow
                    label="Synchroniser ses demandes"
                    description="Permet de synchroniser ses propres demandes avec les services externes."
                    checked={hasMediaRequestSyncOrManage(permissions)}
                    onChange={onToggleMediaRequestSync}
                />
            )}
        </div>
    )
}
