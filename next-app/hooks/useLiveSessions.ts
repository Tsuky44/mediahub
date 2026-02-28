'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface LiveSession {
  sessionId: string
  userName: string
  device?: string | null
  client?: string | null
  itemName?: string | null
  itemType?: string | null
  runTimeTicks?: number | null
  playbackPosition?: number | null
  isPaused: boolean
  source?: string | null
}

export function useLiveSessions(initialSessions: LiveSession[] = []) {
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Determine the protocol and hostname
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
    
    // Priority: Runtime Config -> Build-time Config -> Default (Port 3005)
    // @ts-ignore
    const runtimeUrl = window.__ENV?.TRACKER_WS_URL
    const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    
    const wsUrl = runtimeUrl || buildUrl || `${protocol}://${window.location.hostname}:3005`
    
    console.log(`[WebSocket] Connecting to ${wsUrl}...`)
    const socket: Socket = io(wsUrl, {
      transports: ['websocket'], // Force WebSocket to avoid polling-related flickering
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    })

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to tracker')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from tracker')
      setIsConnected(false)
    })

    socket.on('sessions_init', (data: LiveSession[]) => {
      console.log('[WebSocket] Received initial sessions:', data.length)
      setSessions(data)
    })

    socket.on('sessions_update', (data: LiveSession[]) => {
      console.log('[WebSocket] Received sessions update:', data.length)
      setSessions(data)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return { sessions, isConnected }
}
