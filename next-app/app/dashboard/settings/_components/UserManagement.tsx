'use client'

import type { User, UserRole } from '../_types/user'
import { useUsers } from '../_hooks/useUsers'
import { useUserManagement } from './users/useUserManagement'
import { UserSyncButtons } from './users/UserSyncButtons'
import { ProviderFilterTabs } from './users/ProviderFilterTabs'
import { UserBulkActionBar } from './users/UserBulkActionBar'
import { UserTableRow } from './users/UserTableRow'
import { CreateUserModal } from './users/CreateUserModal'

interface UserManagementProps {
    initialUsers: User[]
    roles: UserRole[]
    readOnly?: boolean
}

export default function UserManagement({ initialUsers, roles, readOnly = false }: UserManagementProps) {
    const {
        users,
        updatingId,
        syncingProvider,
        createUser,
        updateUserRole,
        updateUserNotifications,
        bulkUpdateRole,
        bulkDelete,
        syncProvider,
    } = useUsers(initialUsers)

    const {
        selectedUserIds,
        filterProvider,
        setFilterProvider,
        bulkRole,
        setBulkRole,
        showCreateModal,
        setShowCreateModal,
        editingNotifsId,
        setEditingNotifsId,
        filteredUsers,
        handleSelectAll,
        handleToggleSelect,
        handleBulkApplyRole,
        handleBulkDelete,
        showBulkBar,
    } = useUserManagement(users, readOnly)

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="flex flex-col gap-4 p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Gestion des utilisateurs</h3>
                    <UserSyncButtons
                        syncingProvider={syncingProvider}
                        readOnly={readOnly}
                        onSync={syncProvider}
                        onOpenCreate={() => setShowCreateModal(true)}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <ProviderFilterTabs value={filterProvider} onChange={setFilterProvider} />
                    {showBulkBar && (
                        <UserBulkActionBar
                            selectedCount={selectedUserIds.length}
                            roles={roles}
                            bulkRole={bulkRole}
                            onBulkRoleChange={setBulkRole}
                            onApplyRole={() => handleBulkApplyRole(bulkUpdateRole)}
                            onDelete={() => handleBulkDelete(bulkDelete)}
                        />
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left border-b border-white/10">
                            <th className="pb-4 pl-6 w-10">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.length}
                                    className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                />
                            </th>
                            <th className="pb-4 text-gray-400 font-medium">Utilisateur</th>
                            <th className="pb-4 text-gray-400 font-medium">Email</th>
                            <th className="pb-4 text-gray-400 font-medium">Source</th>
                            <th className="pb-4 text-gray-400 font-medium">Notifications</th>
                            <th className="pb-4 pr-6 text-gray-400 font-medium">Rôle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((user) => (
                            <UserTableRow
                                key={user.id}
                                user={user}
                                roles={roles}
                                isSelected={selectedUserIds.includes(user.id)}
                                isUpdating={updatingId === user.id}
                                readOnly={readOnly}
                                isEditingNotifications={editingNotifsId === user.id}
                                onToggleSelect={() => handleToggleSelect(user.id)}
                                onRoleChange={(value) => updateUserRole(user.id, value)}
                                onStartEditNotifications={() => setEditingNotifsId(user.id)}
                                onStopEditNotifications={() => setEditingNotifsId(null)}
                                onUpdateNotification={(field, value) => updateUserNotifications(user.id, field, value)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreateModal && (
                <CreateUserModal
                    roles={roles}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={async (payload) => {
                        const user = await createUser(payload)
                        return user !== null
                    }}
                />
            )}
        </div>
    )
}
