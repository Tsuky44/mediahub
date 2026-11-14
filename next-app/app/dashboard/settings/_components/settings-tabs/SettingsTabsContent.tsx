'use client'

import UserManagement from '../UserManagement'
import SettingsForm from '../SettingsForm'
import LinkedAccounts from '../LinkedAccounts'
import BackupManagement from '../BackupManagement'
import RoleManagement from '../RoleManagement'
import UserGroupManagement from '../UserGroupManagement'
import SystemMessageManagement from '../SystemMessageManagement'
import AccountRequestsManagement from '../AccountRequestsManagement'
import ActivityLogs from '../ActivityLogs'
// import ExternalNotifications from '../ExternalNotifications' // V1 notifications supprimées
import NotificationsV2Settings from '../NotificationsV2'
import SupportManagement from '../support/SupportManagement'

import type {
    SettingsTabId,
    SettingsTabPermissions,
    SettingsTabsProps,
} from '../../_types/settings-tabs'

/** Onglets sans cartes propres : leur contenu est tenu par un panneau */
const PANEL_TABS: ReadonlySet<SettingsTabId> = new Set(['groups', 'requests', 'linking', 'logs', 'roles', 'support', 'backup'])

interface SettingsTabsContentProps
    extends Pick<SettingsTabsProps, 'dbUsers' | 'settings' | 'roles' | 'userGroups' | 'accountRequests'> {
    activeTab: SettingsTabId
    permissions: SettingsTabPermissions
    canManageSettings: boolean
    canManageUsers: boolean
}

export default function SettingsTabsContent({
    activeTab,
    permissions,
    canManageSettings,
    canManageUsers,
    dbUsers,
    settings,
    roles,
    userGroups,
    accountRequests,
}: SettingsTabsContentProps) {
    // Les onglets faits de cartes se posent directement sur la page (pas de carte dans une carte,
    // qui mangeait la largeur sur téléphone) ; les autres gardent un panneau.
    const hasPanel = PANEL_TABS.has(activeTab)
    return (
        <div className={hasPanel ? 'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl sm:p-6' : undefined}>
            {(activeTab === 'services' || activeTab === 'media' || activeTab === 'downloads' || activeTab === 'automation' || activeTab === 'storage' || activeTab === 'maintenance') && (
                <SettingsForm settings={settings} readOnly={!canManageSettings} />
            )}
            {activeTab === 'users' && permissions.users && (
                <UserManagement
                    initialUsers={dbUsers}
                    roles={roles}
                    readOnly={!canManageUsers}
                />
            )}
            {activeTab === 'groups' && permissions.groups && (
                <UserGroupManagement
                    initialGroups={userGroups}
                    users={dbUsers}
                    roles={roles}
                />
            )}
            {activeTab === 'roles' && permissions.roles && (
                <RoleManagement defaultRoleId={settings.default_role_id} />
            )}
            {activeTab === 'linking' && permissions.linking && <LinkedAccounts />}
            {activeTab === 'backup' && permissions.backup && <BackupManagement />}
            {activeTab === 'messages' && permissions.messages && <SystemMessageManagement />}
            {activeTab === 'requests' && permissions.requests && (
                <AccountRequestsManagement requests={accountRequests} users={dbUsers} />
            )}
            {activeTab === 'logs' && permissions.logs && <ActivityLogs />}
            {/* {activeTab === 'notifications' && permissions.notifications && <ExternalNotifications />} // V1 notifications supprimées */}
            {activeTab === 'notifications-v2' && permissions.notifications && <NotificationsV2Settings />}
            {activeTab === 'support' && permissions.support && <SupportManagement />}
        </div>
    )
}
