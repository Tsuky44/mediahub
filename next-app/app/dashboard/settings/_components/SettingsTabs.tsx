'use client'

import { useMemo } from 'react'
import { useAbility } from '@casl/react'

import { AbilityContext } from '@/components/providers/AbilityContext'

import SettingsTabsNav from './settings-tabs/SettingsTabsNav'
import SettingsTabsContent from './settings-tabs/SettingsTabsContent'
import { useSettingsTabs } from '../_hooks/useSettingsTabs'
import type { SettingsTabPermissions, SettingsTabsProps } from '../_types/settings-tabs'

export default function SettingsTabs({
    dbUsers,
    settings,
    userRole,
    roles,
    userGroups,
    accountRequests,
}: SettingsTabsProps) {
    const ability = useAbility(AbilityContext)

    // User requested strict restriction: "tout se qui est dans l'onglet
    // paramètre laisse le pour les administrateur" — granular CASL checks are
    // intentionally collapsed into a single admin gate.
    const isAdmin = userRole === 'admin' || ability.can('manage', 'all')

    const permissions = useMemo<SettingsTabPermissions>(
        () => ({
            services: isAdmin,
            users: isAdmin,
            groups: isAdmin,
            roles: isAdmin,
            linking: isAdmin,
            backup: isAdmin,
            messages: isAdmin,
            requests: isAdmin,
            logs: isAdmin,
            notifications: isAdmin,
            trackers: isAdmin,
        }),
        [isAdmin]
    )

    const { activeTab, setActiveTab } = useSettingsTabs(permissions)

    const pendingRequestsCount = accountRequests.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.status === 'PENDING'
    ).length

    return (
        <div className="w-full mx-auto space-y-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
                <SettingsTabsNav
                    permissions={permissions}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    pendingRequestsCount={pendingRequestsCount}
                />
            </div>

            <SettingsTabsContent
                activeTab={activeTab}
                permissions={permissions}
                canManageSettings={isAdmin}
                canManageUsers={isAdmin}
                dbUsers={dbUsers}
                settings={settings}
                roles={roles}
                userGroups={userGroups}
                accountRequests={accountRequests}
            />
        </div>
    )
}
