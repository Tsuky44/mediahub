'use client'

import type { NotificationsV2Config } from '@/lib/notifications-v2'

type EvolutionConfig = NotificationsV2Config['evolution']

interface EvolutionApiSectionProps {
  evolution: EvolutionConfig
  onChange: (patch: Partial<EvolutionConfig>) => void
}

export default function EvolutionApiSection({
  evolution,
  onChange,
}: EvolutionApiSectionProps) {
  return (
    <section>
      <h3 className="font-semibold mb-2">Evolution API</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="border rounded px-3 py-2 dark:bg-gray-800"
          placeholder="URL (ex: https://evolution.example.com)"
          value={evolution.apiUrl}
          onChange={(e) => onChange({ apiUrl: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2 dark:bg-gray-800"
          placeholder="API Key"
          type="password"
          value={evolution.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2 dark:bg-gray-800"
          placeholder="Instance"
          value={evolution.instance}
          onChange={(e) => onChange({ instance: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2 dark:bg-gray-800"
          placeholder="Numéro par défaut (ex: 33612345678)"
          value={evolution.defaultNumber ?? ''}
          onChange={(e) => onChange({ defaultNumber: e.target.value })}
        />
      </div>
    </section>
  )
}
