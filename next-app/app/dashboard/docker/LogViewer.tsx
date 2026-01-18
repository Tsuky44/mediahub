'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { X, Trash2, Pause, Play } from 'lucide-react'
import Convert from 'ansi-to-html'

interface LogViewerProps {
  containerId: string
  onClose: () => void
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

export default function LogViewer({ containerId, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // ... existing connection logic ...
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    const wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || `${protocol}://${window.location.hostname}:3005`
    
    console.log(`[LogViewer] Connecting to ${wsUrl}`)
    
    const socket = io(wsUrl, {
        transports: ['websocket'],
        reconnectionAttempts: 10
    })
    
    socketRef.current = socket

    socket.on('connect', () => {
        setIsConnected(true)
        console.log('[LogViewer] Connected, subscribing to', containerId)
        socket.emit('subscribe_docker_logs', containerId)
    })

    socket.on('disconnect', () => {
        setIsConnected(false)
        console.log('[LogViewer] Disconnected')
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                Logs: <span className="font-mono text-blue-400">{containerId}</span>
            </h3>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`p-2 rounded-lg transition-colors ${autoScroll ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    title={autoScroll ? "Pause autoscroll" : "Enable autoscroll"}
                >
                    {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button 
                    onClick={() => setLogs([])}
                    className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Clear logs"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-red-900/50 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black text-gray-300" id="log-container">
            {logs.length === 0 && isConnected && (
                <div className="text-gray-500 italic">Waiting for logs...</div>
            )}
            {logs.map((log, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: log }} className="break-all whitespace-pre-wrap" />
            ))}
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}
