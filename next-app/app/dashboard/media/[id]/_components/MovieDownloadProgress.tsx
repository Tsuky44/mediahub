'use client'

import type { DownloadStatus } from '../download-status-actions'
import { useSmoothProgress } from '../_hooks/useSmoothProgress'

interface MovieDownloadProgressProps {
  status: DownloadStatus
  color: string
}

export function MovieDownloadProgress({ status, color }: MovieDownloadProgressProps) {
  const smooth = useSmoothProgress(status.progress)
  return (
    <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="h-1.5 w-full bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${color}-500`}
              style={{ width: `${smooth}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-bold text-white shrink-0">{status.progress}%</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span className="truncate text-gray-500">{status.releaseTitle || status.title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span>
            {status.sizeLeft} / {status.size}
          </span>
          {status.timeleft && <span className="text-indigo-400">{status.timeleft}</span>}
        </div>
      </div>
    </div>
  )
}
