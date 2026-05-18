'use client'

import { useState } from 'react'
import { Loader2, Wifi, WifiOff } from 'lucide-react'
import type { NotificationsV2Config } from '@/lib/notifications-v2'
import { pingEvolutionApi } from '../../notifications-v2-actions'

type EvolutionConfig = NotificationsV2Config['evolution']

interface EvolutionApiSectionProps {
  evolution: EvolutionConfig
  onChange: (patch: Partial<EvolutionConfig>) => void
}

export default function EvolutionApiSection({
  evolution,
  onChange,
}: EvolutionApiSectionProps) {
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null)

  const handlePing = async () => {
    setPinging(true)
    setPingResult(null)
    const res = await pingEvolutionApi(evolution.apiUrl, evolution.apiKey, evolution.instance)
    setPingResult(res)
    setPinging(false)
  }

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

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handlePing}
          disabled={pinging}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded disabled:opacity-50 transition-colors"
        >
          {pinging
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Wifi className="w-4 h-4" />
          }
          {pinging ? 'Test en cours...' : 'Tester la connexion'}
        </button>

        {pingResult && (
          <span className={`flex items-center gap-1.5 text-sm ${pingResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {!pingResult.success && <WifiOff className="w-4 h-4 shrink-0" />}
            {pingResult.message}
          </span>
        )}
      </div>
    </section>
  )
}
