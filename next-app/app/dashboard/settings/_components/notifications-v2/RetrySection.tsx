'use client'

import { RotateCcw } from 'lucide-react'
import type { NotificationsV2Config } from '@/lib/notifications-v2'

type RetryConfig = NotificationsV2Config['retry']

interface RetrySectionProps {
  retry: RetryConfig
  onChange: (patch: Partial<RetryConfig>) => void
}

export default function RetrySection({ retry, onChange }: RetrySectionProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div className="rounded-lg bg-amber-500/10 p-2">
          <RotateCcw className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Reprise d'erreur</h3>
          <p className="text-xs text-gray-400">Configuration des tentatives de renvoi</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Tentatives max</label>
          <input
            type="number"
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={retry.maxAttempts}
            min={1}
            max={10}
            onChange={(e) =>
              onChange({ maxAttempts: parseInt(e.target.value, 10) || 3 })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Délai base (ms)</label>
          <input
            type="number"
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={retry.baseDelayMs}
            onChange={(e) =>
              onChange({ baseDelayMs: parseInt(e.target.value, 10) || 1000 })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Délai max (ms)</label>
          <input
            type="number"
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={retry.maxDelayMs}
            onChange={(e) =>
              onChange({ maxDelayMs: parseInt(e.target.value, 10) || 15000 })
            }
          />
        </div>
      </div>
    </section>
  )
}
