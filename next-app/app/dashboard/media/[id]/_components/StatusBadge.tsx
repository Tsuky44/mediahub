'use client'

import { getStatusConfig } from '../_utils/download-status'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-${config.color}-500/20 text-${config.color}-400`}
    >
      {config.text}
    </span>
  )
}
