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
        // Toute la largeur de la fenêtre : menu de largeur fixe à gauche, contenu sur le reste.
        // Téléphone : champs en 16 px (sinon iOS zoome à la saisie).
        <div className="w-full space-y-4 lg:space-y-6 max-sm:[&_input]:text-base max-sm:[&_select]:text-base max-sm:[&_textarea]:text-base">
            <h2 className="px-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Paramètres</h2>

            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6 xl:gap-8">
                {/* Reste visible au défilement : sous la barre du haut sur téléphone, en colonne sur ordinateur */}
                <div className="sticky top-16 z-30 -mx-2 bg-onyx-bg px-2 py-2 sm:-mx-4 sm:px-4 lg:top-24 lg:z-10 lg:mx-0 lg:bg-transparent lg:p-0">
                    <SettingsTabsNav
                        permissions={permissions}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        pendingRequestsCount={pendingRequestsCount}
                    />
                </div>
                
                <div className="min-w-0">
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
