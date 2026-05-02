'use client'

import { Tv, User as UserIcon } from 'lucide-react'

interface RequestCardMetaProps {
  mediaType: 'movie' | 'tv'
  statusInfo: {
    bg: string
    border: string
    color: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
  seasons?: number[]
  requesterName: string
}

export function RequestCardMeta({ mediaType, statusInfo, seasons, requesterName }: RequestCardMetaProps) {
  const StatusIcon = statusInfo.icon

  return (
    <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${statusInfo.bg} ${statusInfo.border} ${statusInfo.color}`}>
        <StatusIcon className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wide">
          {statusInfo.label}
        </span>
      </div>

      {mediaType === 'tv' && seasons && seasons.length > 0 && (
        <div className="flex items-center gap-3 bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-500/20 max-w-full">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Tv className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-indigo-400/60 uppercase font-bold leading-none">
              Saisons demandées
            </p>
            <p className="text-sm font-bold text-indigo-300 break-words line-clamp-2">
              {seasons.join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-zinc-700/30 max-w-full">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
          <UserIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-500 uppercase font-bold leading-none">
            Demandé par
          </p>
          <p className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
            {requesterName}
          </p>
        </div>
      </div>
    </div>
  )
}
