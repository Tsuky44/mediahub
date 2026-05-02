'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { colorizeLog } from './log-utils'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }

export function useDockerLogs(containerId: string) {
  const [logs, setLogs] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    // @ts-ignore
    const runtimeUrl = window.__ENV?.TRACKER_WS_URL
    const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    const wsUrl = runtimeUrl || buildUrl || `${protocol}://${window.location.hostname}:3005`

    log(`[LogViewer] Connecting to ${wsUrl}`)

    const socket = io(wsUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
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

  return {
    logs,
    setLogs,
    autoScroll,
    setAutoScroll,
    isConnected,
    logsEndRef,
  }
}
