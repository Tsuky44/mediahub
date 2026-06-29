'use client'

import { useState } from 'react'
import { Loader2, Wifi, WifiOff, Server } from 'lucide-react'
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
    <section className="rounded-xl border border-white/10 bg-black/20 p-5 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div className="rounded-lg bg-indigo-500/10 p-2">
          <Server className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Evolution API</h3>
          <p className="text-xs text-gray-400">Configuration du serveur WhatsApp</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">URL</label>
          <input
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="https://evolution.example.com"
            value={evolution.apiUrl}
            onChange={(e) => onChange({ apiUrl: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">API Key</label>
          <input
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="API Key"
            type="password"
            value={evolution.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Instance</label>
          <input
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Instance"
            value={evolution.instance}
            onChange={(e) => onChange({ instance: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Numéro par défaut</label>
          <input
            className="block w-full rounded-lg border border-white/10 bg-black/30 py-2 px-3 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="33612345678"
            value={evolution.defaultNumber ?? ''}
            onChange={(e) => onChange({ defaultNumber: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handlePing}
          disabled={pinging}
          className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          {pinging
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Wifi className="w-4 h-4" />
          }
          {pinging ? 'Test en cours...' : 'Tester la connexion'}
        </button>

        {pingResult && (
          <span className={`flex items-center gap-1.5 text-sm ${pingResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {!pingResult.success && <WifiOff className="w-4 h-4 shrink-0" />}
            {pingResult.message}
          </span>
        )}
      </div>
    </section>
  )
}
