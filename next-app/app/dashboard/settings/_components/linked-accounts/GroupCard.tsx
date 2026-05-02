'use client'

import { Trash2, Users, X, Link as LinkIcon } from 'lucide-react'
import type { UserGroup, UserGroupMember } from '../../_hooks/useLinkedAccounts'

interface GroupCardProps {
  group: UserGroup
  onDelete: () => void | Promise<void>
  onRemoveMember: (memberId: number) => void | Promise<void>
  onAddMember: () => void | Promise<void>
}

export function GroupCard({ group, onDelete, onRemoveMember, onAddMember }: GroupCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Users size={20} />
          </div>
          <h4 className="font-bold text-white text-lg">{group.name}</h4>
        </div>
        <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {group.members.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Aucun compte lié</p>
        ) : (
          group.members.map((member: UserGroupMember) => (
            <div key={member.id} className="flex items-center justify-between bg-black/20 rounded-lg p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-gray-300 font-medium">{member.username || member.userId}</span>
              </div>
              <button onClick={() => onRemoveMember(member.id)} className="text-gray-500 hover:text-red-400 p-1">
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onAddMember}
        className="w-full py-2 border border-dashed border-gray-700 text-gray-400 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors text-sm flex items-center justify-center gap-2"
      >
        <LinkIcon size={14} />
        Lier un autre compte
      </button>
    </div>
  )
}
