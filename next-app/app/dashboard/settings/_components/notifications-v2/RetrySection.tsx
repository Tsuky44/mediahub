'use client'

import type { NotificationsV2Config } from '@/lib/notifications-v2'

type RetryConfig = NotificationsV2Config['retry']

interface RetrySectionProps {
  retry: RetryConfig
  onChange: (patch: Partial<RetryConfig>) => void
}

export default function RetrySection({ retry, onChange }: RetrySectionProps) {
  return (
    <section>
      <h3 className="font-semibold mb-2">Reprise d'erreur</h3>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          Tentatives max
          <input
            type="number"
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
            value={retry.maxAttempts}
            min={1}
            max={10}
            onChange={(e) =>
              onChange({ maxAttempts: parseInt(e.target.value, 10) || 3 })
            }
          />
        </label>
        <label className="text-sm">
          Délai base (ms)
          <input
            type="number"
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
            value={retry.baseDelayMs}
            onChange={(e) =>
              onChange({ baseDelayMs: parseInt(e.target.value, 10) || 1000 })
            }
          />
        </label>
        <label className="text-sm">
          Délai max (ms)
          <input
            type="number"
            className="w-full border rounded px-3 py-2 dark:bg-gray-800 mt-1"
            value={retry.maxDelayMs}
            onChange={(e) =>
              onChange({ maxDelayMs: parseInt(e.target.value, 10) || 15000 })
            }
          />
        </label>
      </div>
    </section>
  )
}
