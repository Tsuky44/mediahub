'use client'

import { Tv, User as UserIcon } from 'lucide-react'
import { OnyxBeam, OnyxTrack } from '@/components/ui/onyx'
import type { StatusInfo } from '../_utils/request-status'

interface RequestCardMetaProps {
  mediaType: 'movie' | 'tv'
  statusInfo: StatusInfo
  seasons?: number[]
  requesterName: string
}

export function RequestCardMeta({ mediaType, statusInfo, seasons, requesterName }: RequestCardMetaProps) {
  const StatusIcon = statusInfo.icon

  return (
    <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
      <div className={`relative overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusInfo.bg} ${statusInfo.border} ${statusInfo.color}`}>
        {statusInfo.motion === 'beam' && <OnyxBeam />}
        <StatusIcon className={`w-4 h-4 ${statusInfo.iconColor}`} />
        <span className="text-xs font-semibold uppercase tracking-[0.1em]">
          {statusInfo.label}
        </span>
        {statusInfo.motion === 'track' && <OnyxTrack className="absolute inset-x-3 bottom-0.5 h-0.5" />}
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
