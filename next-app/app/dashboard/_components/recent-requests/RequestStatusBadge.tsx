'use client'

import { CalendarClock, CheckCircle2, CircleDashed, Clock, Hourglass } from 'lucide-react'
import { formatReleaseDate } from '@/lib/release-date'

function getStatusIcon(status: number) {
  switch (status) {
    case 5: return <CheckCircle2 className="w-3 h-3 text-green-500" />
    case 4: return <CircleDashed className="w-3 h-3 text-amber-400" />
    case 3: return <Hourglass className="w-3 h-3 text-amber-400" />
    case 2: return <CheckCircle2 className="w-3 h-3 text-indigo-500" />
    default: return <Clock className="w-3 h-3 text-yellow-500" />
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 5: return 'Disponible'
    case 4: return 'Partiel'
    case 3: return 'En cours'
    case 2: return 'Approuvée'
    default: return 'En attente'
  }
}

interface RequestStatusBadgeProps {
  status: number
  /** Demandé mais pas encore sorti */
  awaitingRelease?: boolean
  releaseDate?: string
}

export function RequestStatusBadge({ status, awaitingRelease, releaseDate }: RequestStatusBadgeProps) {
  if (awaitingRelease) {
    const date = releaseDate ? formatReleaseDate(releaseDate) : ''
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/20" title="Demandé, en attente de sortie">
        <CalendarClock className="w-3 h-3 text-gray-100" />
        <span className="text-[10px] font-medium text-gray-100">
          {date ? `Sortie le ${date}` : 'En attente de sortie'}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800/50 border border-gray-700/50">
      {getStatusIcon(status)}
      <span className="text-[10px] font-medium text-gray-300">
        {getStatusText(status)}
      </span>
    </div>
  )
}
