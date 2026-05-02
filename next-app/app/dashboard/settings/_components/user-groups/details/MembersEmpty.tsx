'use client'

import { Users } from 'lucide-react'

export function MembersEmpty() {
  return (
    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
      <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
      <p className="text-gray-500">Aucun membre dans ce groupe</p>
    </div>
  )
}
