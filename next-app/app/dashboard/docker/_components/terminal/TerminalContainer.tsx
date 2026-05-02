'use client'

import { RefObject } from 'react'

interface TerminalContainerProps {
  terminalRef: RefObject<HTMLDivElement | null>
  isConnected: boolean
}

export function TerminalContainer({ terminalRef, isConnected }: TerminalContainerProps) {
  return (
    <div className="flex-1 bg-black/60 p-1 overflow-hidden relative group">
      <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-[#000000]/80 p-3">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {!isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500/50 rounded-full animate-spin" />
          <div className="text-gray-400 font-medium text-sm animate-pulse">Connexion au serveur...</div>
        </div>
      )}
    </div>
  )
}
