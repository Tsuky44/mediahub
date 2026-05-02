'use client'

import { Trash2 } from 'lucide-react'
import type { WebhookTestType, WebhookEvent, Webhook } from '../../_types/webhook'

interface WebhookCardHeaderProps {
  webhook: Webhook
  eventTypes: WebhookEvent[]
  selectedTestEvent: string | undefined
  testingId: string | null
  onSelectTestEvent: (value: string) => void
  onTest: (testType: WebhookTestType) => void
  onRemove: () => void
}

export function WebhookCardHeader({
  webhook,
  eventTypes,
  selectedTestEvent,
  testingId,
  onSelectTestEvent,
  onTest,
  onRemove,
}: WebhookCardHeaderProps) {
  const isTesting = testingId === webhook.id

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/20">
        <select
          value={selectedTestEvent || ''}
          onChange={e => onSelectTestEvent(e.target.value)}
          className="bg-transparent text-[10px] text-indigo-300 outline-none border-none cursor-pointer pr-1"
        >
          {webhook.events?.map((e: string) => (
            <option key={e} value={e} className="bg-gray-900 text-white">
              {eventTypes.find(t => t.id === e)?.label || e}
            </option>
          ))}
        </select>
        <div className="flex rounded-md overflow-hidden border border-indigo-500/20 bg-indigo-500/10">
          {(['default', 'movie', 'tv'] as WebhookTestType[]).map((variant, i, arr) => (
            <button
              key={variant}
              onClick={() => onTest(variant)}
              disabled={isTesting}
              className={`px-2 py-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 ${i < arr.length - 1 ? 'border-r border-indigo-500/20' : ''}`}
              title={
                variant === 'default'
                  ? 'Test basique'
                  : variant === 'movie'
                    ? 'Test Film'
                    : 'Test Série'
              }
            >
              {variant === 'default' ? 'Test' : variant === 'movie' ? 'Film' : 'Série'}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
        title="Supprimer"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
