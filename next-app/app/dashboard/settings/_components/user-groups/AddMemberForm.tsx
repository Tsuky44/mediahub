'use client'

import { useMemo, useState } from 'react'
import { Search, Check, Plus } from 'lucide-react'
import type { UserGroupUserOption } from '../../_types/user-group'

interface AddMemberFormProps {
    users: UserGroupUserOption[]
    excludedUserIds: number[]
    onAdd: (userIds: number[]) => void
    onCancel: () => void
}

/**
 * Formulaire d'ajout de membres (recherche + liste multi-selection + validation).
 * Les users deja membres sont filtres via `excludedUserIds`.
 */
export function AddMemberForm({ users, excludedUserIds, onAdd, onCancel }: AddMemberFormProps) {
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const filteredUsers = useMemo(() => {
        const term = search.toLowerCase()
        return users
            .filter(u => !excludedUserIds.includes(u.id))
            .filter(u =>
                (u.name?.toLowerCase() || '').includes(term) ||
                (u.email?.toLowerCase() || '').includes(term)
            )
    }, [users, excludedUserIds, search])

    const toggleUser = (userId: string) => {
        setSelectedIds(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]))
    }

    const handleAdd = () => {
        onAdd(selectedIds.map(id => parseInt(id)))
    }

    return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-medium text-white mb-3">Ajouter un membre</h4>

            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    autoFocus
                />
            </div>

            <div className="max-h-[240px] overflow-y-auto mb-3 space-y-1 pr-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs italic">Aucun utilisateur trouvé</div>
                ) : (
                    filteredUsers.map(user => {
                        const userId = user.id.toString()
                        const isSelected = selectedIds.includes(userId)
                        return (
                            <div
                                key={user.id}
                                onClick={() => toggleUser(userId)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${
                                    isSelected
                                        ? 'bg-indigo-600/20 border-indigo-500/50'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">
                                        {user.name || 'Sans nom'}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                                </div>
                                {isSelected ? (
                                    <div className="bg-indigo-500 rounded-full p-0.5">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                ) : (
                                    <div className="w-4 h-4 rounded-full border border-gray-600" />
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    Annuler
                </button>
                <button
                    onClick={handleAdd}
                    disabled={selectedIds.length === 0}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" />
                    Ajouter {selectedIds.length > 0 && `(${selectedIds.length})`}
                </button>
            </div>
        </div>
    )
}
