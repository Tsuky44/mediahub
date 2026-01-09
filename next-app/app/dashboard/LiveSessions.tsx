'use client'

import React from 'react'
import { Activity, Clock, Film, Play } from 'lucide-react'

interface Session {
  Id: string
  UserName: string
  DeviceName: string
  Client: string
  NowPlayingItem?: {
    Name: string
    Type: string
    SeriesName?: string
    RunTimeTicks?: number
  }
  PlayState?: {
    PositionTicks?: number
    IsPaused: boolean
  }
}

export function LiveSessions({ sessions }: { sessions: Session[] }) {
  const activeSessions = Array.isArray(sessions) ? sessions.filter(s => s.NowPlayingItem) : []

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <Play className="w-5 h-5 text-green-500 fill-green-500" />
        </div>
        <h2 className="text-xl font-bold text-white">En direct sur Emby</h2>
        {activeSessions.length > 0 && (
          <span className="ml-auto flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
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
            const item = session.NowPlayingItem!
            const isEpisode = item.Type === 'Episode'
            const name = isEpisode ? `${item.SeriesName} - ${item.Name}` : item.Name
            
            // Calcul du pourcentage de progression
            let progress = 0
            if (item.RunTimeTicks && session.PlayState?.PositionTicks) {
              progress = Math.round((session.PlayState.PositionTicks / item.RunTimeTicks) * 100)
            }

            return (
              <div key={session.Id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-green-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                      {name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {session.UserName} • {session.DeviceName}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                    <span>{session.PlayState?.IsPaused ? 'En pause' : 'Lecture en cours'}</span>
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
