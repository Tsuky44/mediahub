'use client'

import { HardDrive } from 'lucide-react'

interface PidsStatCardProps {
  pids: number
}

export function PidsStatCard({ pids }: PidsStatCardProps) {
  return (
    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group md:col-span-2 hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/20">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 -rotate-6">
        <HardDrive className="w-32 h-32 text-orange-500" />
      </div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
          <HardDrive className="w-8 h-8 text-orange-400" />
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase tracking-wider text-xs block mb-1">Processus (PIDs)</span>
          <span className="text-4xl font-black text-white tracking-tight filter drop-shadow-lg">{pids}</span>
        </div>
      </div>
    </div>
  )
}
