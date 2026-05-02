'use client'

import { Activity } from 'lucide-react'
import { formatBytes } from './_utils/format'

interface MemoryStatCardProps {
  memory: {
    used: number
    limit: number
    percent: number
  }
}

export function MemoryStatCard({ memory }: MemoryStatCardProps) {
  return (
    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/20">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 -rotate-12">
        <Activity className="w-24 h-24 text-purple-500" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Mémoire RAM</span>
      </div>
      <div className="flex items-end gap-3 relative z-10">
        <span className="text-4xl font-black text-white tracking-tighter filter drop-shadow-lg">{formatBytes(memory.used)}</span>
        <span className="text-sm text-gray-500 font-bold mb-1.5">/ {formatBytes(memory.limit)}</span>
      </div>
      <div className="w-full bg-black/40 h-3 rounded-full mt-6 overflow-hidden border border-white/5 ring-1 ring-white/5">
        <div
          className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500 relative shadow-[0_0_10px_rgba(147,51,234,0.5)]"
          style={{ width: `${Math.min(memory.percent, 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </div>
  )
}
