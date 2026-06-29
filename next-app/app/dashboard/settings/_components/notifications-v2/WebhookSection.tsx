'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, Webhook, FlaskConical, RotateCcw } from 'lucide-react'
import type { WebhookConfig } from '@/lib/notifications-v2'
import { testWebhook, getDefaultWebhookPayload } from '../../notifications-v2-actions'

interface WebhookSectionProps {
  webhook: WebhookConfig
  onChange: (patch: Partial<WebhookConfig>) => void
}

const NOTIFICATION_TYPES = [
  { label: 'Média demandé', value: 2 },
  { label: 'Média approuvé', value: 4 },
  { label: 'Média disponible', value: 8 },
  { label: 'Échec média', value: 16 },
  { label: 'Test', value: 32 },
  { label: 'Média refusé', value: 64 },
  { label: 'Auto-approuvé', value: 128 },
  { label: 'Médias en cours', value: 256 },
] as const

export default function WebhookSection({ webhook, onChange }: WebhookSectionProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [resetting, setResetting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testWebhook(webhook)
    setTestResult(result)
    setTesting(false)
  }

  const handleResetPayload = async () => {
    setResetting(true)
    const defaultPayload = await getDefaultWebhookPayload()
    onChange({ jsonPayload: defaultPayload })
    setResetting(false)
  }

  const toggleType = (value: number) => {
    const current = webhook.types
    const newTypes = (current & value) ? (current & ~value) : (current | value)
    onChange({ types: newTypes })
  }

  const addHeader = () => {
    onChange({ customHeaders: [...(webhook.customHeaders ?? []), { key: '', value: '' }] })
  }

  const removeHeader = (index: number) => {
    const headers = [...(webhook.customHeaders ?? [])]
    headers.splice(index, 1)
    onChange({ customHeaders: headers })
  }

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const headers = [...(webhook.customHeaders ?? [])]
    headers[index] = { ...headers[index], [field]: val }
    onChange({ customHeaders: headers })
  }

  return (
    <section className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Webhook</h3>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600 dark:text-gray-400">Activé</span>
          <div
            onClick={() => onChange({ enabled: !webhook.enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              webhook.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                webhook.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </label>
      </div>

      <div className="p-4 space-y-4">
        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL du Webhook <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://exemple.com/webhook"
            value={webhook.webhookUrl}
            onChange={(e) => onChange({ webhookUrl: e.target.value })}
          />
        </div>

        {/* Auth Header */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            En-tête d&apos;autorisation
          </label>
          <input
            type="text"
            className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Bearer eyJ..."
            value={webhook.authHeader ?? ''}
            onChange={(e) => onChange({ authHeader: e.target.value })}
          />
        </div>

        {/* Support Variables */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={webhook.supportVariables ?? false}
            onChange={(e) => onChange({ supportVariables: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Support variables dans l&apos;URL <span className="text-xs text-gray-500">(ex: {'{{'}{'{notification_type}'}{'}}'})</span>
          </span>
        </label>

        {/* Custom Headers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            En-têtes personnalisés
          </label>
          <div className="space-y-2">
            {(webhook.customHeaders ?? []).map((header, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border dark:border-gray-600 rounded px-3 py-1.5 dark:bg-gray-800 text-sm"
                  placeholder="Nom"
                  value={header.key}
                  onChange={(e) => updateHeader(index, 'key', e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 border dark:border-gray-600 rounded px-3 py-1.5 dark:bg-gray-800 text-sm"
                  placeholder="Valeur"
                  value={header.value}
                  onChange={(e) => updateHeader(index, 'value', e.target.value)}
                />
                <button
                  onClick={() => removeHeader(index)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addHeader}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <Plus className="w-4 h-4" />
              Ajouter un en-tête
            </button>
          </div>
        </div>

        {/* JSON Payload */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              JSON Payload <span className="text-red-500">*</span>
            </label>
            <button
              onClick={handleResetPayload}
              disabled={resetting}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Réinitialiser
            </button>
          </div>
          <textarea
            rows={12}
            className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            placeholder={`{\n  "notification_type": "{{notification_type}}",\n  ...\n}`}
            value={webhook.jsonPayload}
            onChange={(e) => onChange({ jsonPayload: e.target.value })}
            spellCheck={false}
          />
          <p className="text-xs text-gray-500 mt-1">
            Variables disponibles : <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{notification_type}}'}</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{subject}}'}</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{message}}'}</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{image}}'}</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{media_type}}'}</code>,{' '}
            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{requestedBy_username}}'}</code>
          </p>
        </div>

        {/* Notification Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Types de notification
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {NOTIFICATION_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhook.types === 0 || !!(webhook.types & t.value)}
                  onChange={() => toggleType(t.value)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-gray-700 dark:text-gray-300">{t.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">0 = tous les types activés</p>
        </div>

        {/* Test button */}
        <div className="flex items-center gap-3 pt-2 border-t dark:border-gray-700">
          <button
            onClick={handleTest}
            disabled={testing || !webhook.webhookUrl}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50 transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            {testing ? 'Envoi...' : 'Tester le webhook'}
          </button>
          {testResult && (
            <span className={`text-sm ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {testResult.message}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
