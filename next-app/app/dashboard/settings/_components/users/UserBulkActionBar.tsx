'use client'

import type { UserRole } from '../../_types/user'

interface UserBulkActionBarProps {
    selectedCount: number
    roles: UserRole[]
    bulkRole: string
    onBulkRoleChange: (value: string) => void
    onApplyRole: () => void
    onDelete: () => void
}

/**
 * Barre d'actions groupees (changer role, supprimer) pour les utilisateurs selectionnes.
 */
export function UserBulkActionBar({
    selectedCount,
    roles,
    bulkRole,
    onBulkRoleChange,
    onApplyRole,
    onDelete,
}: UserBulkActionBarProps) {
    return (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-right-4">
            <span className="text-sm text-indigo-200 font-medium">
                {selectedCount} sélectionné(s)
            </span>
            <div className="h-4 w-px bg-indigo-500/20" />
            <select
                value={bulkRole}
                onChange={(e) => onBulkRoleChange(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                <option value="">Choisir un rôle...</option>
                <option value="none">Aucun rôle</option>
                {roles.length > 0 && (
                    <optgroup label="Rôles personnalisés">
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </optgroup>
                )}
            </select>
            <button
                onClick={onApplyRole}
                disabled={!bulkRole}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Appliquer
            </button>
            <div className="h-4 w-px bg-indigo-500/20 mx-1" />
            <button
                onClick={onDelete}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors"
            >
                Supprimer
            </button>
        </div>
    )
}
