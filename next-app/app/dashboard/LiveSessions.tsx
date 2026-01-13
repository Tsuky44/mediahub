'use client'

import React from 'react'
import { Activity, Clock, Film, Play, Wifi, WifiOff } from 'lucide-react'
import { useLiveSessions, LiveSession } from '@/hooks/useLiveSessions'

export function LiveSessions({ sessions: initialSessions, instanceId, filteredInstanceIds }: { sessions: any[], instanceId?: number, filteredInstanceIds?: number[] }) {
  // Use WebSocket for real-time updates
  const { sessions: wsSessions, isConnected } = useLiveSessions(initialSessions)
  const [sessions, setSessions] = React.useState<any[]>(initialSessions)
  const [interpolatedSessions, setInterpolatedSessions] = React.useState<any[]>([])

  // Update sessions when WebSocket updates - only if data actually changed
  React.useEffect(() => {
    if (!wsSessions) return

    setSessions(prev => {
        // Simple deep equal check to avoid unnecessary state updates
        if (JSON.stringify(prev) === JSON.stringify(wsSessions)) return prev
        return wsSessions
    })
  }, [wsSessions])

  // Interpolation logic
  React.useEffect(() => {
    if (!sessions) return
    
    // Filter sessions by instanceId or source type if provided
    const filteredSessions = sessions.filter(s => {
        // Source filtering logic
        if (filteredInstanceIds && filteredInstanceIds.length > 0) {
          if (!filteredInstanceIds.includes(s.instanceId)) return false
        } else if (instanceId && s.instanceId !== instanceId) {
          return false
        }
        return true
    })

    // Initialize interpolated sessions only when filtered sessions change
    setInterpolatedSessions(prev => {
        if (JSON.stringify(prev.map(p => ({...p, playbackPosition: 0}))) === 
            JSON.stringify(filteredSessions.map(s => ({...s, playbackPosition: 0})))) {
            return prev
        }
        return filteredSessions.map(s => ({ ...s }))
    })

    const interval = setInterval(() => {
      setInterpolatedSessions(prev => {
        let hasChanged = false
        const next = prev.map(s => {
          if (s.isPaused || !s.runTimeTicks || s.playbackPosition === undefined) return s
          
          // Increment position by 1 second (10,000,000 ticks)
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
  }, [sessions, instanceId, filteredInstanceIds])
  
  // Memoize active sessions to avoid re-filtering on every render
  const activeSessions = React.useMemo(() => 
    Array.isArray(interpolatedSessions) ? interpolatedSessions.filter(s => s.itemName) : []
  , [interpolatedSessions])

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6 backdrop-blur-sm mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <Play className="w-5 h-5 text-green-500 fill-green-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Sessions en direct</h2>
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
            const mediaInfo = session.mediaInfo || {}
            
            let displayName = session.itemName
            let subName = `${session.userName} • ${session.device}`

            if (isEpisode) {
                if (mediaInfo.seriesName) {
                    displayName = mediaInfo.seriesName
                    subName = `${session.itemName} • ${subName}`
                } else if (session.itemName?.includes(' : ')) {
                    const parts = session.itemName.split(' : ')
                    displayName = parts[0]
                    subName = `${parts.slice(1).join(' : ')} • ${subName}`
                }

                const s = mediaInfo.seasonIndex
                const e = mediaInfo.episodeIndex
                if (s !== undefined && e !== undefined) {
                    const seasonStr = s < 10 ? `0${s}` : s
                    const episodeStr = e < 10 ? `0${e}` : e
                    subName = `S${seasonStr}E${episodeStr} • ${subName}`
                }
            }
            
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate flex-1">
                        {displayName}
                      </h3>
                      {session.source && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            session.source === 'plex' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            session.source === 'jellyfin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                            {session.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {subName}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
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
