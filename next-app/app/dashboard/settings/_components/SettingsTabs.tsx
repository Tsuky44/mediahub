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
            media: isAdmin,
            downloads: isAdmin,
            automation: isAdmin,
            storage: isAdmin,
            maintenance: isAdmin,
            users: isAdmin,
            groups: isAdmin,
            roles: isAdmin,
            linking: isAdmin,
            backup: isAdmin,
            messages: isAdmin,
            requests: isAdmin,
            logs: isAdmin,
            notifications: isAdmin,
            support: isAdmin,
        }),
        [isAdmin]
    )

    const { activeTab, setActiveTab } = useSettingsTabs(permissions)

    const pendingRequestsCount = accountRequests.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => r.status === 'PENDING'
    ).length

    return (
        <div className="w-full mx-auto space-y-6 max-w-7xl">
            <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-3">
                    <SettingsTabsNav
                        permissions={permissions}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        pendingRequestsCount={pendingRequestsCount}
                    />
                </div>
                
                <div className="lg:col-span-9">
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
            </div>
        </div>
    )
}
