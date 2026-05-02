'use client'

import Link from 'next/link'
import type { InterpolatedSession } from './useLiveSessionsInterpolation'
import { formatSessionDisplay } from './formatSessionDisplay'

interface LiveSessionCardProps {
  session: InterpolatedSession
}

export function LiveSessionCard({ session }: LiveSessionCardProps) {
  const { displayName, subName, progress, href, source } = formatSessionDisplay(session)

  const Content = (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-green-500/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate flex-1 group-hover:text-green-400 transition-colors">
              {displayName}
            </h3>
            {source && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  source === 'plex'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : source === 'jellyfin'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}
              >
                {source}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{subName}</p>
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

  return href ? (
    <Link href={href} className="block">
      {Content}
    </Link>
  ) : (
    <div>{Content}</div>
  )
}
