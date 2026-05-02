'use client'

import { Terminal as TerminalIcon, RefreshCw, X } from 'lucide-react'
import clsx from 'clsx'

interface TerminalHeaderProps {
  containerId: string
  containerName?: string
  isConnected: boolean
  onReconnect: () => void
  onClose: () => void
}

export function TerminalHeader({
  containerId,
  containerName,
  isConnected,
  onReconnect,
  onClose,
}: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
          <TerminalIcon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            Terminal
            <span className="px-2.5 py-1 rounded-xl bg-white/5 text-sm font-bold text-gray-400 border border-white/5 font-mono shadow-sm">
              {containerName || containerId.substring(0, 12)}
            </span>
            <div
              className={clsx(
                'flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300',
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                  : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10'
              )}
            >
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full shadow-sm',
                  isConnected
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                    : 'bg-red-400'
                )}
              />
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </div>
          </h3>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onReconnect}
          className="p-2.5 bg-white/5 border border-white/5 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)] group"
          title="Reconnecter"
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
        </button>
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-300 text-gray-400 hover:text-red-400 hover:rotate-90 hover:shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
