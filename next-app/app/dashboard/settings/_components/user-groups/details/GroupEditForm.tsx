'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { UserGroup, UserGroupRoleOption } from '../../../_types/user-group'

interface GroupEditFormProps {
  group: UserGroup
  roles: UserGroupRoleOption[]
  onSave: (name: string, roleId: string) => void
  onCancel: () => void
}

export function GroupEditForm({ group, roles, onSave, onCancel }: GroupEditFormProps) {
  const [name, setName] = useState(group.name)
  const [roleId, setRoleId] = useState(group.roleId || '')

  return (
    <div className="flex flex-col gap-3 min-w-[300px]">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-indigo-500"
      />
      <select
        value={roleId}
        onChange={e => setRoleId(e.target.value)}
        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
      >
        <option value="">Aucun rôle assigné</option>
        {roles.map(role => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(name, roleId)}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <Check className="w-3 h-3" /> Sauvegarder
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Annuler
        </button>
      </div>
    </div>
  )
}
