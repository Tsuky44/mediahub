'use client'

import { Tv } from 'lucide-react'
import { SectionHeader, CheckboxField, InputField, TestButton } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import type { TestResult } from './useMediaSettingsTests'

interface EmbySettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  loading: boolean
  result: TestResult | null
  onTest: () => void
  readOnly?: boolean
}

export function EmbySettings({ formData, updateField, loading, result, onTest, readOnly }: EmbySettingsProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <SectionHeader icon={Tv} title="Emby" description="Configuration du serveur Emby principal" />
      <div className="mb-6">
        <CheckboxField
          label="Activer l'authentification Emby"
          checked={formData.auth_emby_enabled}
          onChange={v => updateField('auth_emby_enabled', v)}
          description="Permettre aux utilisateurs de se connecter via ce serveur Emby"
          readOnly={readOnly}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL du serveur"
          value={formData.emby_url}
          onChange={v => updateField('emby_url', v)}
          placeholder="http://localhost:8096"
        />
        <InputField
          label="Clé API"
          value={formData.emby_api_key}
          onChange={v => updateField('emby_api_key', v)}
          type="password"
        />
      </div>
      <TestButton onClick={onTest} loading={loading} result={result} />
    </div>
  )
}
