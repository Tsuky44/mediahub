'use client'

import { Plus, Shield } from 'lucide-react'

interface RoleListHeaderProps {
  onAdd: () => void
}

export function RoleListHeader({ onAdd }: RoleListHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Gestion des rôles
        </h3>
        <p className="text-gray-400 text-sm mt-1">
          Créez et gérez les rôles utilisateurs et leurs permissions
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
      >
        <Plus size={16} />
        Nouveau rôle
      </button>
    </div>
  )
}
