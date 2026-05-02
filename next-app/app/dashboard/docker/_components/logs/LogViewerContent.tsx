'use client'

import { RefObject } from 'react'

interface LogViewerContentProps {
  logs: string[]
  isConnected: boolean
  logsEndRef: RefObject<HTMLDivElement | null>
}

export function LogViewerContent({ logs, isConnected, logsEndRef }: LogViewerContentProps) {
  return (
    <div
      className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-black/40 text-gray-300 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      id="log-container"
    >
      {logs.length === 0 && isConnected && (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
          <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500/50 rounded-full animate-spin" />
          <p className="text-sm font-medium animate-pulse">En attente de logs...</p>
        </div>
      )}
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: log }}
            className="break-all whitespace-pre-wrap hover:bg-white/[0.02] transition-colors rounded px-2 -mx-2"
          />
        ))}
      </div>
      <div ref={logsEndRef} />
    </div>
  )
}
