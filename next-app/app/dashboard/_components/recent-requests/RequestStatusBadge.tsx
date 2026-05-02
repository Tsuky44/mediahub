'use client'

import { CheckCircle2, Clock, Hourglass } from 'lucide-react'

function getStatusIcon(status: number) {
  switch (status) {
    case 5: return <CheckCircle2 className="w-3 h-3 text-green-500" />
    case 4: return <CheckCircle2 className="w-3 h-3 text-purple-500" />
    case 3: return <Hourglass className="w-3 h-3 text-blue-500" />
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
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800/50 border border-gray-700/50">
      {getStatusIcon(status)}
      <span className="text-[10px] font-medium text-gray-300">
        {getStatusText(status)}
      </span>
    </div>
  )
}
