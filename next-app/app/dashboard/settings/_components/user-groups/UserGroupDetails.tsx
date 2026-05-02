'use client'

import { UserPlus } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption, UserGroupUserOption } from '../../_types/user-group'
import { AddMemberForm } from './AddMemberForm'
import { useGroupDetails } from './details/useGroupDetails'
import { GroupHeader } from './details/GroupHeader'
import { MembersList } from './details/MembersList'
import { MembersEmpty } from './details/MembersEmpty'

interface UserGroupDetailsProps {
  group: UserGroup
  roles: UserGroupRoleOption[]
  users: UserGroupUserOption[]
  onUpdate: (groupId: string, name: string, roleId: string) => void
  onDelete: (groupId: string) => void
  onAddMembers: (groupId: string, userIds: number[]) => void
  onRemoveMember: (groupId: string, userId: number) => void
}

/** Panneau droite : details d'un groupe + membres + formulaire d'ajout. */
export function UserGroupDetails({
  group,
  roles,
  users,
  onUpdate,
  onDelete,
  onAddMembers,
  onRemoveMember,
}: UserGroupDetailsProps) {
  const {
    isEditing,
    setIsEditing,
    showAddMember,
    setShowAddMember,
    handleDelete,
    handleRemoveMember,
    handleSave,
    handleAdd,
  } = useGroupDetails(group.id, onUpdate, onDelete, onAddMembers, onRemoveMember)

  return (
    <>
      <GroupHeader
        group={group}
        roles={roles}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
        onSave={handleSave}
        onCancelEdit={() => setIsEditing(false)}
      />

      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Membres du groupe</h3>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-sm transition-colors border border-indigo-500/30"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter un membre
          </button>
        </div>

        {showAddMember && (
          <AddMemberForm
            users={users}
            excludedUserIds={group.members.map(m => m.userId)}
            onAdd={handleAdd}
            onCancel={() => setShowAddMember(false)}
          />
        )}

        {group.members.length === 0 ? (
          <MembersEmpty />
        ) : (
          <MembersList members={group.members} onRemove={handleRemoveMember} />
        )}
      </div>
    </>
  )
}
