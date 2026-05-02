'use client'

import { Activity } from 'lucide-react'

interface StatsErrorProps {
  message: string
}

export function StatsError({ message }: StatsErrorProps) {
  return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center backdrop-blur-md">
      <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
      <p className="font-medium">{message}</p>
    </div>
  )
}
