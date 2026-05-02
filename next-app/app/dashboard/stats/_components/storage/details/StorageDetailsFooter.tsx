'use client'

import { Trash2 } from 'lucide-react'

interface StorageDetailsFooterProps {
  type: string
  onDelete: () => void
}

export function StorageDetailsFooter({ type, onDelete }: StorageDetailsFooterProps) {
  return (
    <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
      <button
        onClick={onDelete}
        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
      >
        <Trash2 size={18} />
        Supprimer {type === 'Series' ? 'la série complète' : 'le film'}
      </button>
    </div>
  )
}
