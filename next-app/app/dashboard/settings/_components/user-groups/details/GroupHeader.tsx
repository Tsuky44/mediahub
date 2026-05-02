'use client'

import { Shield, Edit2, Trash2 } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption } from '../../../_types/user-group'
import { GroupEditForm } from './GroupEditForm'

interface GroupHeaderProps {
  group: UserGroup
  roles: UserGroupRoleOption[]
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onSave: (name: string, roleId: string) => void
  onCancelEdit: () => void
}

export function GroupHeader({
  group,
  roles,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
}: GroupHeaderProps) {
  return (
    <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/10">
      <div>
        {isEditing ? (
          <GroupEditForm group={group} roles={roles} onSave={onSave} onCancel={onCancelEdit} />
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">{group.name}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                <Shield className="w-4 h-4 text-indigo-400" />
                {group.role ? (
                  <span className="text-indigo-200 font-medium">{group.role.name}</span>
                ) : (
                  <span className="text-gray-500 italic">Aucun rôle</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
