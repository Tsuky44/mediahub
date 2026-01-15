import React from 'react'
import { Loader2, Activity } from 'lucide-react'

export default function StatsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full space-y-6">
      <div className="relative">
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
        
        {/* Spinner container */}
        <div className="relative bg-gray-900/50 p-8 rounded-3xl border border-gray-800 backdrop-blur-sm shadow-2xl flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <Activity className="absolute inset-0 m-auto h-6 w-6 text-blue-400 opacity-50" />
          </div>
          
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">Calcul des stats en cours</h2>
            <p className="text-sm text-gray-500 animate-pulse">Analyse des données de visionnage...</p>
          </div>
        </div>
      </div>
      
      {/* Skeleton-like placeholder hint */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl opacity-20 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-800/50 border border-gray-700/30 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
