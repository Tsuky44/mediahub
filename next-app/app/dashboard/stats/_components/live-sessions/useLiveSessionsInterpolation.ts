'use client'

import React from 'react'
import { useLiveSessions, LiveSession } from '@/hooks/useLiveSessions'

export interface InterpolatedSession extends LiveSession {
  seriesName?: string
  SeriesName?: string
  seasonIndex?: number
  ParentIndexNumber?: number
  episodeIndex?: number
  IndexNumber?: number
  mediaInfo?: string | Record<string, unknown>
  tmdbId?: number | string
  TmdbId?: number | string
  itemId?: string
  NowPlayingItemId?: string
  Id?: string
}

export function useLiveSessionsInterpolation(initialSessions: InterpolatedSession[]) {
  const { sessions: wsSessions, isConnected } = useLiveSessions(initialSessions as LiveSession[])
  const [sessions, setSessions] = React.useState<InterpolatedSession[]>(initialSessions)
  const [interpolatedSessions, setInterpolatedSessions] = React.useState<InterpolatedSession[]>([])

  React.useEffect(() => {
    if (!wsSessions) return

    setSessions(prev => {
      if (JSON.stringify(prev) === JSON.stringify(wsSessions)) return prev
      return wsSessions as InterpolatedSession[]
    })
  }, [wsSessions])

  React.useEffect(() => {
    if (!sessions) return

    setInterpolatedSessions(prev => {
      if (
        JSON.stringify(prev.map(p => ({ ...p, playbackPosition: 0 }))) ===
        JSON.stringify(sessions.map(s => ({ ...s, playbackPosition: 0 })))
      ) {
        return prev
      }
      return sessions.map(s => ({ ...s }))
    })

    const interval = setInterval(() => {
      setInterpolatedSessions(prev => {
        let hasChanged = false
        const next = prev.map(s => {
          if (s.isPaused || !s.runTimeTicks || s.playbackPosition === undefined) return s

          const newPosition = Number(s.playbackPosition) + 10000000
          if (newPosition <= Number(s.runTimeTicks)) {
            hasChanged = true
            return { ...s, playbackPosition: newPosition }
          }
          return s
        })
        return hasChanged ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [sessions])

  const activeSessions = React.useMemo(
    () => (Array.isArray(interpolatedSessions) ? interpolatedSessions.filter(s => s.itemName) : []),
    [interpolatedSessions]
  )

  return { activeSessions, isConnected }
}
