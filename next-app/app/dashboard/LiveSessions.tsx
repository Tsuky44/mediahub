'use client'

import React from 'react'
import { Activity, Clock, Film, Play, Wifi, WifiOff } from 'lucide-react'
import { useLiveSessions, LiveSession } from '@/hooks/useLiveSessions'

export function LiveSessions({ sessions: initialSessions, instanceId }: { sessions: any[], instanceId?: number }) {
  // Use WebSocket for real-time updates
  const { sessions: wsSessions, isConnected } = useLiveSessions(initialSessions)
  const [sessions, setSessions] = React.useState<any[]>(initialSessions)
  const [interpolatedSessions, setInterpolatedSessions] = React.useState<any[]>([])

  // Update sessions when WebSocket updates
  React.useEffect(() => {
    if (wsSessions && wsSessions.length > 0) {
      setSessions(wsSessions)
    } else if (wsSessions && wsSessions.length === 0 && isConnected) {
      setSessions([])
    }
  }, [wsSessions, isConnected])

  // Interpolation logic
  React.useEffect(() => {
    if (!sessions) return
    
    // Filter sessions by instanceId if provided
    const filteredSessions = instanceId 
      ? sessions.filter(s => s.instanceId === instanceId)
      : sessions

    setInterpolatedSessions(filteredSessions.map(s => ({ ...s })))

    const interval = setInterval(() => {
      setInterpolatedSessions(prev => 
        prev.map(s => {
          if (s.isPaused || !s.runTimeTicks || s.playbackPosition === undefined) return s
          
          // Increment position by 1 second (10,000,000 ticks)
          const newPosition = Number(s.playbackPosition) + 10000000
          if (newPosition <= Number(s.runTimeTicks)) {
            return { ...s, playbackPosition: newPosition }
          }
          return s
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [sessions, instanceId])
  
  // Filter sessions that have an item playing
  const activeSessions = Array.isArray(interpolatedSessions) ? interpolatedSessions.filter(s => s.itemName) : []

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6 backdrop-blur-sm mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <Play className="w-5 h-5 text-green-500 fill-green-500" />
        </div>
        <h2 className="text-xl font-bold text-white">En direct sur Emby</h2>
        <div className="flex items-center gap-2 ml-auto">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
              <Wifi size={10} />
              <span>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              <WifiOff size={10} />
              <span>DÉCONNECTÉ</span>
            </div>
          )}
          {activeSessions.length > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
      </div>

      {activeSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 bg-gray-800/50 rounded-full mb-4">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Aucune lecture en cours actuellement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeSessions.map((session) => {
            const isEpisode = session.itemType === 'Episode'
            // We might want to store series name in DB if we want to display it here, 
            // for now we just use itemName which usually contains the episode name
            const name = session.itemName
            
            // Calcul du pourcentage de progression
            let progress = 0
            if (session.runTimeTicks && session.playbackPosition) {
              const total = Number(session.runTimeTicks)
              const current = Number(session.playbackPosition)
              if (total > 0) {
                  progress = Math.round((current / total) * 100)
              }
            }

            return (
              <div key={session.sessionId} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-green-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                      {name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {session.userName} • {session.device}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span>{session.isPaused ? 'En pause' : 'Lecture en cours'}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-1000" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
