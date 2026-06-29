'use client'

import { Settings } from 'lucide-react'

interface ManageMediaButtonProps {
  onClick: () => void
}

export function ManageMediaButton({ onClick }: ManageMediaButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700 transition text-white group"
      title="Gérer le média"
    >
      <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
    </button>
  )
}
