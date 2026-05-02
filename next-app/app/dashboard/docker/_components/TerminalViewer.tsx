'use client'

import { useTerminal } from './terminal/useTerminal'
import { TerminalAccessDenied } from './terminal/TerminalAccessDenied'
import { TerminalHeader } from './terminal/TerminalHeader'
import { TerminalContainer } from './terminal/TerminalContainer'

interface TerminalViewerProps {
  containerId: string
  containerName?: string
  onClose: () => void
  canManageContainers?: boolean
}

export default function TerminalViewer({
  containerId,
  containerName,
  onClose,
  canManageContainers = false,
}: TerminalViewerProps) {
  const { terminalRef, socketRef, xtermRef, isConnected } = useTerminal(containerId, containerName)

  if (!canManageContainers) {
    return <TerminalAccessDenied onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/10">
        <TerminalHeader
          containerId={containerId}
          containerName={containerName}
          isConnected={isConnected}
          onReconnect={() => {
            xtermRef.current?.clear()
            socketRef.current?.emit('start_terminal_session', containerId)
          }}
          onClose={onClose}
        />
        <TerminalContainer terminalRef={terminalRef} isConnected={isConnected} />
      </div>
    </div>
  )
}
