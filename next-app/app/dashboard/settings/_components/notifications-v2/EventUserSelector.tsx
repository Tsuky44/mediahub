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
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400">
        Utilisateurs destinataires
      </label>
      <select
        className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value=""
        onChange={handleAdd}
      >
        <option value="" className="bg-gray-800">— Ajouter un utilisateur —</option>
        {users
          .filter((u) => !selectedIds.includes(u.id))
          .map((u) => (
            <option key={u.id} value={u.id} className="bg-gray-800">
              {(u.name || u.email) +
                (u.hasWhatsapp ? '' : ' ⚠️ sans WhatsApp')}
            </option>
          ))}
      </select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((uid) => {
            const u = users.find((x) => x.id === uid)
            const label = u ? u.name || u.email : `User #${uid}`
            const warn = u && !u.hasWhatsapp
            return (
              <span
                key={uid}
                className={
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ' +
                  (warn
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20')
                }
                title={warn ? 'Aucun numéro WhatsApp sur ce compte' : ''}
              >
                {label}
                {warn && ' ⚠️'}
                <button
                  type="button"
                  onClick={() => handleRemove(uid)}
                  className="hover:text-white ml-1 text-[14px] leading-none"
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
