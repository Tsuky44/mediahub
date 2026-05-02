'use client'

import { Filter, X } from 'lucide-react'

interface FilterModalHeaderProps {
  onClose: () => void
}

export function FilterModalHeader({ onClose }: FilterModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Filter className="h-5 w-5 text-indigo-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Filtres avancés</h2>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  )
}
