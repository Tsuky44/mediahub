'use client'

import { RotateCcw } from 'lucide-react'

interface FilterConfigBarProps {
  onReset: () => void
}

export function FilterConfigBar({ onReset }: FilterConfigBarProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-bold uppercase tracking-[2px] text-gray-500">Configuration des filtres</span>
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Réinitialiser tout
      </button>
    </div>
  )
}
