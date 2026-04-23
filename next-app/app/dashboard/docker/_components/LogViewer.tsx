'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { X, Trash2, Pause, Play, FileText } from 'lucide-react'
import Convert from 'ansi-to-html'

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


interface LogViewerProps {
  containerId: string
  onClose: () => void
  canReadDetails?: boolean
}

const convert = new Convert({
  newline: true,
  escapeXML: true,
  fg: '#e5e7eb', // gray-200
  bg: '#000000'
})

const colorizeLog = (text: string) => {
    // 1. Convert ANSI to HTML first
    let html = convert.toHtml(text)

    // 2. If the text doesn't already have HTML colors from ANSI, apply coloring
    if (!html.includes('style="color')) {
        // Check for full line coloring (Errors and Warnings)
        if (/\b(ERROR|FATAL|ERR|FAIL)\b/i.test(text)) {
            return `<span style="color: #ef4444">${html}</span>`
        }
        if (/\b(WARN|WARNING)\b/i.test(text)) {
            return `<span style="color: #f59e0b">${html}</span>`
        }

        // Granular coloring for other lines
        // Timestamps (e.g., 2026-01-16T14:48:05Z)
        html = html.replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g, '<span style="color: #6b7280">$1</span>')
        
        // Log levels
        html = html.replace(/\b(INFO)\b/gi, '<span style="color: #10b981; font-weight: bold">$1</span>')
        html = html.replace(/\b(DEBUG)\b/gi, '<span style="color: #3b82f6">$1</span>')
        
        // Brackets contents (often tags like [wireguard], [dns])
        html = html.replace(/\[([^\]]+)\]/g, '<span style="color: #60a5fa">[$1]</span>')
    }
    
    return html
}

export default function LogViewer({ containerId, onClose, canReadDetails = false }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  if (!canReadDetails) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-red-500/5">
                  <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                      <X className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                      <h2 className="text-2xl font-black text-white mb-2">Accès Refusé</h2>
                      <p className="text-gray-400">Vous n'avez pas la permission de voir les logs.</p>
                  </div>
                  <button 
                      onClick={onClose}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all font-bold w-full"
                  >
                      Fermer
                  </button>
              </div>
          </div>
      )
  }

  useEffect(() => {
    // ... existing connection logic ...
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    
    // Priority: Runtime Config -> Build-time Config -> Default (Port 3005)
    // @ts-ignore
    const runtimeUrl = window.__ENV?.TRACKER_WS_URL
    const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    
    const wsUrl = runtimeUrl || buildUrl || `${protocol}://${window.location.hostname}:3005`
    
    log(`[LogViewer] Connecting to ${wsUrl}`)
    
    const socket = io(wsUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 10
    })
    
    socketRef.current = socket

    socket.on('connect', () => {
        setIsConnected(true)
        log('[LogViewer] Connected, subscribing to', containerId)
        socket.emit('subscribe_docker_logs', containerId)
    })

    socket.on('disconnect', () => {
        setIsConnected(false)
        log('[LogViewer] Disconnected')
    })

    socket.on('docker_log_chunk', (chunk: string) => {
        const html = colorizeLog(chunk)
        setLogs(prev => {
            const newLogs = [...prev, html]
            if (newLogs.length > 1000) return newLogs.slice(newLogs.length - 1000)
            return newLogs
        })
    })
    
    socket.on('docker_log_error', (err: string) => {
        setLogs(prev => [...prev, `<span style="color: red">Error: ${err}</span>`])
    })

    return () => {
        socket.emit('unsubscribe_docker_logs')
        socket.disconnect()
    }
  }, [containerId])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] ring-1 ring-white/10">
        {/* Header */}
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
                        <div className={`flex items-center gap-2 px-2 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {isConnected ? 'Connecté' : 'Déconnecté'}
                        </div>
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`p-2.5 rounded-xl transition-all duration-200 border ${autoScroll ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    title={autoScroll ? "Pause autoscroll" : "Activer autoscroll"}
                >
                    {autoScroll ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button 
                    onClick={() => setLogs([])}
                    className="p-2.5 bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
                    title="Effacer les logs"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <button 
                    onClick={onClose}
                    className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:rotate-90"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-black/40 text-gray-300 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10" id="log-container">
            {logs.length === 0 && isConnected && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                    <div className="w-10 h-10 border-4 border-white/10 border-t-indigo-500/50 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse">En attente de logs...</p>
                </div>
            )}
            <div className="space-y-1">
                {logs.map((log, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: log }} className="break-all whitespace-pre-wrap hover:bg-white/[0.02] transition-colors rounded px-2 -mx-2" />
                ))}
            </div>
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}
