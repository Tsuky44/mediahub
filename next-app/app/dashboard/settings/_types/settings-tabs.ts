import type { ComponentType } from 'react'

export type SettingsTabId =
    | 'services'
    | 'media'
    | 'downloads'
    | 'automation'
    | 'storage'
    | 'maintenance'
    | 'users'
    | 'groups'
    | 'roles'
    | 'linking'
    | 'backup'
    | 'messages'
    | 'requests'
    | 'logs'
    | 'notifications'
    | 'notifications-v2'
    | 'trackers'
    | 'support'

/**
 * Per-tab visibility flags. The `notifications-v2` tab shares the
 * `notifications` permission key with the regular notifications tab in the
 * original component, so it is not represented here separately.
 */
export interface SettingsTabPermissions {
    services: boolean
    media: boolean
    downloads: boolean
    automation: boolean
    storage: boolean
    maintenance: boolean
    users: boolean
    groups: boolean
    roles: boolean
    linking: boolean
    backup: boolean
    messages: boolean
    requests: boolean
    logs: boolean
    notifications: boolean
    trackers: boolean
    support: boolean
}

export type SettingsTabPermissionKey = keyof SettingsTabPermissions

export interface SettingsTabIcon {
    size?: number
    className?: string
}

export interface SettingsTabDef {
    id: SettingsTabId
    label: string
    icon: ComponentType<SettingsTabIcon>
    permissionKey: SettingsTabPermissionKey
}

/**
 * Props of the public SettingsTabs entry point.
 *
 * The shapes for the dynamic data slices (`dbUsers`, `settings`, `roles`,
 * `userGroups`, `accountRequests`) are intentionally kept loose here because
 * the upstream server component passes raw Prisma models and they are
 * forwarded verbatim to children that still consume `any`. Tightening these
 * types is tracked separately and out of scope for this refactor.
 */
export interface SettingsTabsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbUsers: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: any
    userRole: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userGroups: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accountRequests: any[]
}
