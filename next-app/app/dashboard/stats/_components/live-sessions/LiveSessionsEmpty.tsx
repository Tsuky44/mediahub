'use client'

import { Play } from 'lucide-react'

export function LiveSessionsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="p-4 bg-gray-800/50 rounded-full mb-4 animate-onyx-float">
        <Play className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-gray-500 text-sm">Aucune lecture en cours actuellement.</p>
    </div>
  )
}
