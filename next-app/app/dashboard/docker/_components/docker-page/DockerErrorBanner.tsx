'use client'

import { Activity } from 'lucide-react'

interface DockerErrorBannerProps {
  error: string
}

export function DockerErrorBanner({ error }: DockerErrorBannerProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
      <Activity className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium">{error}</p>
    </div>
  )
}
