'use client'

import { X } from 'lucide-react'
import type { UserGroup } from '../../../_types/user-group'

interface MembersListProps {
  members: UserGroup['members']
  onRemove: (userId: number) => void
}

export function MembersList({ members, onRemove }: MembersListProps) {
  return (
    <div className="space-y-2">
      {members.map(member => (
        <div
          key={member.userId}
          className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {member.user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{member.user.name || 'Sans nom'}</div>
              <div className="text-xs text-gray-500">{member.user.email}</div>
            </div>
          </div>
          <button
            onClick={() => onRemove(member.userId)}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Retirer du groupe"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
