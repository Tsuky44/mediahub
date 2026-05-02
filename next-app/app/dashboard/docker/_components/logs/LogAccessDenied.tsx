'use client'

import { X } from 'lucide-react'

interface LogAccessDeniedProps {
  onClose: () => void
}

export function LogAccessDenied({ onClose }: LogAccessDeniedProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-red-500/5">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Accès Refusé</h2>
          <p className="text-gray-400">
            Vous n&apos;avez pas la permission de voir les logs.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-bold w-full"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
