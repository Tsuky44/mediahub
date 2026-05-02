'use client'

import { Network } from 'lucide-react'
import { formatBytes } from './_utils/format'

interface NetworkStatCardProps {
  network: {
    rx: number
    tx: number
  }
}

export function NetworkStatCard({ network }: NetworkStatCardProps) {
  return (
    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group md:col-span-2 hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/20">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 rotate-6">
        <Network className="w-32 h-32 text-emerald-500" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
          <Network className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Réseau (Total)</span>
      </div>
      <div className="grid grid-cols-2 gap-12 relative z-10">
        <div className="space-y-2 group/item">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center gap-2 group-hover/item:text-emerald-400 transition-colors">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Téléchargé (RX)
          </span>
          <div className="text-3xl font-black text-white tracking-tight filter drop-shadow-lg">{formatBytes(network.rx)}</div>
        </div>
        <div className="space-y-2 group/item">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center gap-2 group-hover/item:text-blue-400 transition-colors">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            Envoyé (TX)
          </span>
          <div className="text-3xl font-black text-white tracking-tight filter drop-shadow-lg">{formatBytes(network.tx)}</div>
        </div>
      </div>
    </div>
  )
}
