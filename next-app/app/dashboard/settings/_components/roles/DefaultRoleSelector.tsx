'use client'

import type { Role } from './useRoleManagement'

interface DefaultRoleSelectorProps {
  roles: Role[]
  currentDefaultRoleId: string | undefined
  savingDefault: boolean
  onSetDefault: (roleId: string) => void
}

export function DefaultRoleSelector({
  roles,
  currentDefaultRoleId,
  savingDefault,
  onSetDefault,
}: DefaultRoleSelectorProps) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
      <h3 className="text-xl font-bold text-white mb-4">Rôle par défaut</h3>
      <p className="text-gray-400 mb-4">
        Le rôle par défaut est attribué aux nouveaux utilisateurs.
        En changeant ce rôle,{' '}
        <strong>
          tous les utilisateurs ayant l&apos;ancien rôle par défaut seront automatiquement migrés vers le nouveau.
        </strong>
      </p>

      <div className="flex items-center gap-4">
        <select
          value={currentDefaultRoleId || ''}
          onChange={e => onSetDefault(e.target.value)}
          disabled={savingDefault}
          className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Aucun rôle par défaut</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        {savingDefault && (
          <div className="text-indigo-400 text-sm animate-pulse">Mise à jour en cours...</div>
        )}
      </div>
    </div>
  )
}
