'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { io, Socket } from 'socket.io-client'
import { X, RefreshCw, Terminal as TerminalIcon } from 'lucide-react'
import clsx from 'clsx'

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


interface TerminalViewerProps {
  containerId: string
  containerName?: string
  onClose: () => void
  canManageContainers?: boolean
}

export default function TerminalViewer({ containerId, containerName, onClose, canManageContainers = false }: TerminalViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canManageContainers) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-red-500/10 ring-1 ring-red-500/10 scale-100 animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-inner shadow-red-500/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <X className="w-10 h-10 text-red-500 relative z-10" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Accès Refusé</h2>
          <p className="text-gray-400 text-lg">Vous n'avez pas la permission d'accéder à la console.</p>
        </div>
        <button 
          onClick={onClose}
          className="w-full px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-2xl transition-all font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-red-500/10"
        >
          Fermer
        </button>
      </div>
    </div>
      )
  }

  useEffect(() => {
    // 1. Initialize Xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#00000000', // transparent for glassmorphism effect if supported, else fallback
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
    
    // Priority: Runtime Config -> Build-time Config -> Default (Port 3005)
    // @ts-ignore
    const runtimeUrl = window.__ENV?.TRACKER_WS_URL
    const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    
    const wsUrl = runtimeUrl || buildUrl || `${protocol}://${window.location.hostname}:3005`
    
    log(`[Terminal] Connecting to ${wsUrl}`)
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
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
                    <div className={clsx(
                        "flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-300",
                        isConnected 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10" 
                            : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10"
                    )}>
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full shadow-sm",
                            isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400"
                        )} />
                        {isConnected ? 'Connecté' : 'Déconnecté'}
                    </div>
                </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                xtermRef.current?.clear()
                socketRef.current?.emit('start_terminal_session', containerId)
              }}
              className="p-2.5 bg-white/5 border border-white/5 text-gray-400 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)] group"
              title="Reconnecter"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2"></div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-300 text-gray-400 hover:text-red-400 hover:rotate-90 hover:shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Container */}
        <div className="flex-1 bg-black/60 p-1 overflow-hidden relative group">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 bg-[#000000]/80 p-3">
                <div ref={terminalRef} className="w-full h-full" />
            </div>
            
            {/* Overlay for error/loading states if needed */}
            {!isConnected && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none gap-4">
                    <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500/50 rounded-full animate-spin"></div>
                    <div className="text-gray-400 font-medium text-sm animate-pulse">Connexion au serveur...</div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
