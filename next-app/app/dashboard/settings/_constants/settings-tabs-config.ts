import {
    Users,
    UsersRound,
    Shield,
    Link as LinkIcon,
    Database,
    MessageSquare,
    UserPlus,
    Activity,
    BellRing,
    Tv,
    Download,
    Bot,
    HardDrive,
    Wrench,
    LifeBuoy,
} from 'lucide-react'

import type { SettingsTabDef, SettingsTabId } from '../_types/settings-tabs'

export interface SettingsCategory {
    title: string
    tabs: readonly SettingsTabId[]
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
    {
        title: 'Système & Services',
        tabs: ['media', 'downloads', 'automation', 'storage', 'backup', 'maintenance', 'notifications-v2'],
    },
    {
        title: 'Utilisateurs & Accès',
        tabs: ['users', 'groups', 'roles', 'requests', 'linking'],
    },
    {
        title: 'Monitoring & Outils',
        tabs: ['messages', 'logs', 'support'],
    },
] as const

/**
 * Ordered tab catalog. The order also drives the fallback selection in
 * `useSettingsTabs` (first visible tab wins when no `?tab=` query param is
 * provided).
 */
export const SETTINGS_TABS: readonly SettingsTabDef[] = [
    { id: 'media', label: 'Média & Intégrations', icon: Tv, permissionKey: 'media' },
    { id: 'downloads', label: 'Téléchargements', icon: Download, permissionKey: 'downloads' },
    { id: 'automation', label: 'Automatisation', icon: Bot, permissionKey: 'automation' },
    { id: 'storage', label: 'Stockage', icon: HardDrive, permissionKey: 'storage' },
    { id: 'backup', label: 'Sauvegarde', icon: Database, permissionKey: 'backup' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, permissionKey: 'maintenance' },
    { id: 'notifications-v2', label: 'Notifications', icon: BellRing, permissionKey: 'notifications' },
    { id: 'users', label: 'Utilisateurs', icon: Users, permissionKey: 'users' },
    { id: 'groups', label: 'Groupes', icon: UsersRound, permissionKey: 'groups' },
    { id: 'roles', label: 'Rôles & Permissions', icon: Shield, permissionKey: 'roles' },
    { id: 'requests', label: 'Demandes', icon: UserPlus, permissionKey: 'requests' },
    { id: 'linking', label: 'Lier', icon: LinkIcon, permissionKey: 'linking' },
    { id: 'messages', label: 'Messages Système', icon: MessageSquare, permissionKey: 'messages' },
    { id: 'logs', label: 'Activité', icon: Activity, permissionKey: 'logs' },
    { id: 'support', label: 'Support & Tickets', icon: LifeBuoy, permissionKey: 'support' },
] as const

const SETTINGS_TAB_ID_SET: ReadonlySet<SettingsTabId> = new Set<SettingsTabId>([
    'services', // pour la rétro-compatibilité
    ...SETTINGS_TABS.map(t => t.id)
])

export function isSettingsTabId(value: string | null | undefined): value is SettingsTabId {
    return typeof value === 'string' && SETTINGS_TAB_ID_SET.has(value as SettingsTabId)
}
