'use client'

import { X, Server } from 'lucide-react'
import clsx from 'clsx'

interface ContainerInfo {
  id: string
  name: string
  icon?: string
  status: string
  state: string
}

interface StatsModalHeaderProps {
  container: ContainerInfo
  onClose: () => void
}

export function StatsModalHeader({ container, onClose }: StatsModalHeaderProps) {
  return (
    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-10">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center shadow-lg shadow-blue-500/10">
          {container.icon ? (
            <img src={container.icon} alt={container.name} className="w-8 h-8 object-contain drop-shadow-md" />
          ) : (
            <Server className="w-7 h-7 text-blue-400" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">{container.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={clsx(
                'w-2.5 h-2.5 rounded-full shadow-sm',
                container.state === 'RUNNING'
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              )}
            />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{container.status}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-3 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95 hover:rotate-90 duration-300"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  )
}
