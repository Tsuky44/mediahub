'use client'

import type { Webhook } from '../../_types/webhook'

interface WebhookCustomFormProps {
  webhook: Webhook
  onUpdate: (field: string, value: string | boolean) => void
}

export function WebhookCustomForm({ webhook, onUpdate }: WebhookCustomFormProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">URL du Webhook</label>
      <input
        type="url"
        value={webhook.url || ''}
        onChange={e => onUpdate('url', e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        placeholder="https://..."
      />
      <p className="text-xs text-gray-500 mt-2">
        Le payload envoyé sera un JSON contenant: title, message, event, data
      </p>
    </div>
  )
}
