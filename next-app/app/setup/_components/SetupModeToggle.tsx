'use client'

import { Server, Upload } from 'lucide-react'

interface SetupModeToggleProps {
  mode: 'configure' | 'restore'
  onChange: (mode: 'configure' | 'restore') => void
}

export function SetupModeToggle({ mode, onChange }: SetupModeToggleProps) {
  return (
    <div className="flex p-1 bg-white/5 rounded-xl mb-8">
      <button
        onClick={() => onChange('configure')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'configure'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Server size={16} />
        Nouvelle Installation
      </button>
      <button
        onClick={() => onChange('restore')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
          mode === 'restore'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Upload size={16} />
        Restaurer une sauvegarde
      </button>
    </div>
  )
}
