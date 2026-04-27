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
import ExternalNotifications from '../ExternalNotifications'
import NotificationsV2Settings from '../NotificationsV2'
import { TrackerStatsManagement } from '../TrackerStatsManagement'

import type {
    SettingsTabId,
    SettingsTabPermissions,
    SettingsTabsProps,
} from '../../_types/settings-tabs'

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
    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            {activeTab === 'services' && permissions.services && (
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
            {activeTab === 'notifications' && permissions.notifications && <ExternalNotifications />}
            {activeTab === 'notifications-v2' && permissions.notifications && <NotificationsV2Settings />}
            {activeTab === 'trackers' && permissions.trackers && <TrackerStatsManagement />}
        </div>
    )
}
