import {
    Server,
    Users,
    UsersRound,
    Shield,
    Link as LinkIcon,
    Database,
    MessageSquare,
    UserPlus,
    Activity,
    Bell,
    BellRing,
    BarChart3,
} from 'lucide-react'

import type { SettingsTabDef, SettingsTabId } from '../_types/settings-tabs'

/**
 * Ordered tab catalog. The order also drives the fallback selection in
 * `useSettingsTabs` (first visible tab wins when no `?tab=` query param is
 * provided).
 */
export const SETTINGS_TABS: readonly SettingsTabDef[] = [
    { id: 'services', label: 'Services', icon: Server, permissionKey: 'services' },
    { id: 'users', label: 'Utilisateurs', icon: Users, permissionKey: 'users' },
    { id: 'groups', label: 'Groupes', icon: UsersRound, permissionKey: 'groups' },
    { id: 'roles', label: 'Rôles', icon: Shield, permissionKey: 'roles' },
    { id: 'linking', label: 'Lier', icon: LinkIcon, permissionKey: 'linking' },
    { id: 'backup', label: 'Sauvegarde', icon: Database, permissionKey: 'backup' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, permissionKey: 'messages' },
    { id: 'requests', label: 'Demandes', icon: UserPlus, permissionKey: 'requests' },
    { id: 'logs', label: 'Activité', icon: Activity, permissionKey: 'logs' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permissionKey: 'notifications' },
    { id: 'notifications-v2', label: 'Notif V2', icon: BellRing, permissionKey: 'notifications' },
    { id: 'trackers', label: 'Trackers', icon: BarChart3, permissionKey: 'trackers' },
] as const

const SETTINGS_TAB_ID_SET: ReadonlySet<SettingsTabId> = new Set(
    SETTINGS_TABS.map(t => t.id)
)

export function isSettingsTabId(value: string | null | undefined): value is SettingsTabId {
    return typeof value === 'string' && SETTINGS_TAB_ID_SET.has(value as SettingsTabId)
}
