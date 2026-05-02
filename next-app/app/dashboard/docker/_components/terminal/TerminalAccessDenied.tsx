'use client'

import { X } from 'lucide-react'

interface TerminalAccessDeniedProps {
  onClose: () => void
}

export function TerminalAccessDenied({ onClose }: TerminalAccessDeniedProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-red-500/10 ring-1 ring-red-500/10 scale-100 animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-inner shadow-red-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <X className="w-10 h-10 text-red-500 relative z-10" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Accès Refusé</h2>
          <p className="text-gray-400 text-lg">
            Vous n&apos;avez pas la permission d&apos;accéder à la console.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-2xl transition-all font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-red-500/10"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
