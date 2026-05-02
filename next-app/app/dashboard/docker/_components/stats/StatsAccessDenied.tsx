'use client'

import { Activity } from 'lucide-react'

interface StatsAccessDeniedProps {
  onClose: () => void
}

export function StatsAccessDenied({ onClose }: StatsAccessDeniedProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl ring-1 ring-red-500/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
          <Activity className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Accès Refusé</h2>
          <p className="text-gray-400 font-medium">
            Vous n&apos;avez pas la permission de voir les statistiques de ce conteneur.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all w-full border border-white/5 hover:border-white/10"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
