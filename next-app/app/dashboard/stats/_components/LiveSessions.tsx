'use client'

import { useLiveSessionsInterpolation } from './live-sessions/useLiveSessionsInterpolation'
import { LiveSessionsHeader } from './live-sessions/LiveSessionsHeader'
import { LiveSessionsEmpty } from './live-sessions/LiveSessionsEmpty'
import { LiveSessionCard } from './live-sessions/LiveSessionCard'

export function LiveSessions({ sessions: initialSessions, canManage }: { sessions: any[]; canManage?: boolean }) {
  const { activeSessions, isConnected } = useLiveSessionsInterpolation(initialSessions)

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6 backdrop-blur-sm mb-8">
      <LiveSessionsHeader isConnected={isConnected} activeCount={activeSessions.length} />

      {activeSessions.length === 0 ? (
        <LiveSessionsEmpty />
      ) : (
        <div className="onyx-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeSessions.map(session => (
            <LiveSessionCard key={session.sessionId} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
