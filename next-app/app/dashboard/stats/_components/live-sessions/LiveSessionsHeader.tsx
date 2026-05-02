'use client'

import { Play, Wifi, WifiOff } from 'lucide-react'

interface LiveSessionsHeaderProps {
  isConnected: boolean
  activeCount: number
}

export function LiveSessionsHeader({ isConnected, activeCount }: LiveSessionsHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-green-500/10 rounded-lg">
        <Play className="w-5 h-5 text-green-500 fill-green-500" />
      </div>
      <h2 className="text-xl font-bold text-white">Sessions en direct</h2>
      <div className="flex items-center gap-2 ml-auto">
        {isConnected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            <Wifi size={10} />
            <span>LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
            <WifiOff size={10} />
            <span>DÉCONNECTÉ</span>
          </div>
        )}
        {activeCount > 0 && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
      </div>
    </div>
  )
}
