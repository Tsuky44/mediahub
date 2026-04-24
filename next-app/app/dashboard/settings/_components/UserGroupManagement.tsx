'use client'

import { Users } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption, UserGroupUserOption } from '../_types/user-group'
import { useUserGroups } from '../_hooks/useUserGroups'
import { UserGroupList } from './user-groups/UserGroupList'
import { UserGroupDetails } from './user-groups/UserGroupDetails'

interface UserGroupManagementProps {
    initialGroups: UserGroup[]
    users: UserGroupUserOption[]
    roles: UserGroupRoleOption[]
}

export default function UserGroupManagement({ initialGroups, users, roles }: UserGroupManagementProps) {
    const {
        groups,
        selectedGroup,
        selectGroup,
        createGroup,
        updateGroup,
        deleteGroup,
        addMembers,
        removeMember,
    } = useUserGroups(initialGroups)

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
            <UserGroupList
                groups={groups}
                roles={roles}
                selectedGroupId={selectedGroup?.id || null}
                onSelect={selectGroup}
                onCreate={(name, roleId) => createGroup(name, roleId)}
            />

            <div className="flex-1 flex flex-col">
                {selectedGroup ? (
                    <UserGroupDetails
                        group={selectedGroup}
                        roles={roles}
                        users={users}
                        onUpdate={(groupId, name, roleId) => updateGroup(groupId, name, roleId)}
                        onDelete={deleteGroup}
                        onAddMembers={addMembers}
                        onRemoveMember={removeMember}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <p>Sélectionnez un groupe pour voir les détails</p>
                    </div>
                )}
            </div>
        </div>
    )
}
