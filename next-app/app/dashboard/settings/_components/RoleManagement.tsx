'use client'

import RoleEditor from './RoleEditor'
import { useRoleManagement } from './roles/useRoleManagement'
import { DefaultRoleSelector } from './roles/DefaultRoleSelector'
import { RoleListHeader } from './roles/RoleListHeader'
import { RoleCard } from './roles/RoleCard'

export default function RoleManagement({ defaultRoleId }: { defaultRoleId?: string }) {
  const {
    roles,
    isLoading,
    isEditing,
    selectedRole,
    currentDefaultRoleId,
    savingDefault,
    handleSetDefaultRole,
    handleDelete,
    handleImpersonate,
    handleSaveRole,
    startEditing,
    cancelEditing,
  } = useRoleManagement(defaultRoleId)

  if (isEditing) {
    return (
      <RoleEditor
        role={selectedRole}
        onSave={handleSaveRole}
        onCancel={cancelEditing}
      />
    )
  }

  return (
    <div className="space-y-6">
      <DefaultRoleSelector
        roles={roles}
        currentDefaultRoleId={currentDefaultRoleId}
        savingDefault={savingDefault}
        onSetDefault={handleSetDefaultRole}
      />

      <RoleListHeader onAdd={() => startEditing(undefined)} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => startEditing(role)}
              onDelete={handleDelete}
              onImpersonate={handleImpersonate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
