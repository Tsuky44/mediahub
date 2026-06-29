'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { io, Socket } from 'socket.io-client'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }

export function useTerminal(containerId: string, containerName?: string) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#00000000',
        foreground: '#e4e4e7',
        cursor: '#a8a29e',
        selectionBackground: '#27272a',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    if (terminalRef.current) {
      term.open(terminalRef.current)
      fitAddon.fit()
    }

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    const runtimeUrl = window.__ENV?.TRACKER_WS_URL
    const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    const fallbackUrl = process.env.NODE_ENV === 'development'
      ? `${protocol}://${window.location.hostname}:3005`
      : undefined

    const wsUrl = runtimeUrl || buildUrl || fallbackUrl

    log(`[Terminal] Connecting to ${wsUrl || 'relative host'}`)

    const socket = io(wsUrl || undefined, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setError(null)
      term.write('\r\n\x1b[32m✔ Connected to terminal server.\x1b[0m\r\n')
      term.write(`\r\n\x1b[34mℹ Requesting session for container: ${containerName || containerId}...\x1b[0m\r\n`)
      socket.emit('start_terminal_session', containerId)
      socket.emit('terminal_resize', { cols: term.cols, rows: term.rows })
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

    term.onData(data => {
      socket.emit('terminal_input', data)
    })

    term.onResize(size => {
      socket.emit('terminal_resize', { cols: size.cols, rows: size.rows })
    })

    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      socket.disconnect()
      term.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [containerId, containerName])

  return {
    terminalRef,
    socketRef,
    xtermRef,
    isConnected,
    error,
  }
}
