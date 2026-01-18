'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { io, Socket } from 'socket.io-client'
import { X, RefreshCw } from 'lucide-react'

interface TerminalViewerProps {
  containerId: string
  containerName?: string
  onClose: () => void
}

export default function TerminalViewer({ containerId, containerName, onClose }: TerminalViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Initialize Xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#a8a29e', // stone-400
        selectionBackground: '#27272a', // zinc-800
      },
      allowProposedApi: true
    })
    
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    if (terminalRef.current) {
      term.open(terminalRef.current)
      fitAddon.fit()
    }
    
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // 2. Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    const wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || `${protocol}://${window.location.hostname}:3005`
    
    console.log(`[Terminal] Connecting to ${wsUrl}`)
    
    const socket = io(wsUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    })
    
    socketRef.current = socket

    // 3. Setup Socket Events
    socket.on('connect', () => {
      setIsConnected(true)
      setError(null)
      term.write('\r\n\x1b[32m✔ Connected to terminal server.\x1b[0m\r\n')
      term.write(`\r\n\x1b[34mℹ Requesting session for container: ${containerName || containerId}...\x1b[0m\r\n`)
      
      // Start session
      socket.emit('start_terminal_session', containerId)
      
      // Send initial size
      socket.emit('terminal_resize', {
        cols: term.cols,
        rows: term.rows
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      term.write('\r\n\x1b[31m✖ Disconnected from terminal server.\x1b[0m\r\n')
    })

    socket.on('terminal_output', (data: string) => {
      term.write(data)
    })

    socket.on('terminal_error', (msg: string) => {
      setError(msg)
      term.write(`\r\n\x1b[31m✖ Error: ${msg}\x1b[0m\r\n`)
    })
    
    socket.on('terminal_exit', () => {
      term.write('\r\n\x1b[33m⚠ Session ended.\x1b[0m\r\n')
    })

    // 4. Setup Terminal Input
    term.onData((data) => {
      socket.emit('terminal_input', data)
    })

    term.onResize((size) => {
      socket.emit('terminal_resize', {
        cols: size.cols,
        rows: size.rows
      })
    })

    // 5. Handle Window Resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      socket.disconnect()
      term.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [containerId, containerName])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <h3 className="font-medium text-zinc-100 flex items-center gap-2">
              Terminal: <span className="text-purple-400 font-mono text-sm">{containerName || containerId.substring(0, 12)}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                xtermRef.current?.clear()
                socketRef.current?.emit('start_terminal_session', containerId)
              }}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Reconnecter"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Container */}
        <div className="flex-1 bg-[#09090b] p-2 overflow-hidden relative group">
            <div ref={terminalRef} className="w-full h-full" />
            
            {/* Overlay for error/loading states if needed */}
            {!isConnected && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="text-zinc-500 text-sm">Connexion au serveur...</div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
