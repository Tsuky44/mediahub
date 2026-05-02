'use client'

import { FileText, Pause, Play, Trash2, X } from 'lucide-react'

interface LogViewerHeaderProps {
  containerId: string
  isConnected: boolean
  autoScroll: boolean
  onToggleAutoScroll: () => void
  onClear: () => void
  onClose: () => void
}

export function LogViewerHeader({
  containerId,
  isConnected,
  autoScroll,
  onToggleAutoScroll,
  onClear,
  onClose,
}: LogViewerHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]">
          <FileText className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            Logs
            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-sm font-medium text-gray-400 border border-white/5 font-mono">
              {containerId.substring(0, 12)}
            </span>
            <div
              className={`flex items-center gap-2 px-2 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </div>
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAutoScroll}
          className={`p-2.5 rounded-xl transition-all duration-200 border ${
            autoScroll
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title={autoScroll ? 'Pause autoscroll' : 'Activer autoscroll'}
        >
          {autoScroll ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={onClear}
          className="p-2.5 bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
          title="Effacer les logs"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-white/10 mx-2" />
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:rotate-90"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
