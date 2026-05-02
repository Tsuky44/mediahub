'use client'

import { Shield, Eye, Edit2, Trash2, Users } from 'lucide-react'
import type { Role } from './useRoleManagement'

interface RoleCardProps {
  role: Role
  onEdit: (role: Role) => void
  onDelete: (roleId: string) => void
  onImpersonate: (roleId: string) => void
}

export function RoleCard({ role, onEdit, onDelete, onImpersonate }: RoleCardProps) {
  return (
    <div className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all relative overflow-hidden">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
          <Shield size={20} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onImpersonate(role.id)}
            className="p-2 text-gray-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-500/10"
            title="Voir en tant que ce rôle"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onEdit(role)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            title="Modifier"
          >
            <Edit2 size={16} />
          </button>
          {!role.isSystem && (
            <button
              onClick={() => onDelete(role.id)}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <h4 className="text-lg font-bold text-white mb-1 relative z-10">{role.name}</h4>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10 relative z-10">
        {role.description || 'Aucune description'}
      </p>

      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-black/20 py-2 px-3 rounded-lg w-fit relative z-10">
        <Users size={14} />
        {role._count?.users || 0} utilisateurs
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
    </div>
  )
}
