'use client'

import { useDockerLogs } from './logs/useDockerLogs'
import { LogAccessDenied } from './logs/LogAccessDenied'
import { LogViewerHeader } from './logs/LogViewerHeader'
import { LogViewerContent } from './logs/LogViewerContent'

interface LogViewerProps {
  containerId: string
  onClose: () => void
  canReadDetails?: boolean
}

export default function LogViewer({ containerId, onClose, canReadDetails = false }: LogViewerProps) {
  const { logs, setLogs, autoScroll, setAutoScroll, isConnected, logsEndRef } = useDockerLogs(containerId)

  if (!canReadDetails) {
    return <LogAccessDenied onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] ring-1 ring-white/10">
        <LogViewerHeader
          containerId={containerId}
          isConnected={isConnected}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll(prev => !prev)}
          onClear={() => setLogs([])}
          onClose={onClose}
        />
        <LogViewerContent logs={logs} isConnected={isConnected} logsEndRef={logsEndRef} />
      </div>
    </div>
  )
}
