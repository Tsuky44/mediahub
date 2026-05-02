'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import type { WebhookTestResult as WebhookTestResultType } from '../../_types/webhook'

interface WebhookTestResultProps {
  result: WebhookTestResultType | null
  webhookId: string
}

export function WebhookTestResult({ result, webhookId }: WebhookTestResultProps) {
  if (!result || result.id !== webhookId) return null

  return (
    <div
      className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
        result.success
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {result.success ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={16} className="mt-0.5 shrink-0" />
      )}
      <span className="break-all">{result.message}</span>
    </div>
  )
}
