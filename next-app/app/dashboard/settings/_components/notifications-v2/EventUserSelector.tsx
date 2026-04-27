'use client'

import type { UserOption } from '../../_types/notifications-v2'

interface EventUserSelectorProps {
  users: UserOption[]
  targetUserIds: number[]
  onChange: (targetUserIds: number[]) => void
}

export default function EventUserSelector({
  users,
  targetUserIds,
  onChange,
}: EventUserSelectorProps) {
  const selectedIds = targetUserIds ?? []

  const handleAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10)
    if (!id) return
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id])
    }
    e.target.value = ''
  }

  const handleRemove = (uid: number) => {
    onChange(selectedIds.filter((x) => x !== uid))
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">
        Utilisateurs destinataires (leur numéro WhatsApp sera utilisé)
      </label>
      <select
        className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800"
        value=""
        onChange={handleAdd}
      >
        <option value="">— Ajouter un utilisateur —</option>
        {users
          .filter((u) => !selectedIds.includes(u.id))
          .map((u) => (
            <option key={u.id} value={u.id}>
              {(u.name || u.email) +
                (u.hasWhatsapp ? '' : ' ⚠️ sans WhatsApp')}
            </option>
          ))}
      </select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selectedIds.map((uid) => {
            const u = users.find((x) => x.id === uid)
            const label = u ? u.name || u.email : `User #${uid}`
            const warn = u && !u.hasWhatsapp
            return (
              <span
                key={uid}
                className={
                  'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ' +
                  (warn
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30')
                }
                title={warn ? 'Aucun numéro WhatsApp sur ce compte' : ''}
              >
                {label}
                {warn && ' ⚠️'}
                <button
                  type="button"
                  onClick={() => handleRemove(uid)}
                  className="hover:text-black dark:hover:text-white ml-1"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
