'use client'

import { Tv } from 'lucide-react'
import { SectionHeader, CheckboxField, InputField, TestButton } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import type { TestResult } from './useMediaSettingsTests'

interface JellyfinSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  loading: boolean
  result: TestResult | null
  onTest: () => void
  readOnly?: boolean
}

export function JellyfinSettings({ formData, updateField, loading, result, onTest, readOnly }: JellyfinSettingsProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Tv} title="Jellyfin" description="Configuration alternative Jellyfin" />
      <div className="mb-6">
        <CheckboxField
          label="Activer l'authentification Jellyfin"
          checked={formData.auth_jellyfin_enabled}
          onChange={v => updateField('auth_jellyfin_enabled', v)}
          description="Permettre aux utilisateurs de se connecter via ce serveur Jellyfin"
          readOnly={readOnly}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL du serveur"
          value={formData.jellyfin_url}
          onChange={v => updateField('jellyfin_url', v)}
          placeholder="http://localhost:8096"
        />
        <InputField
          label="Clé API"
          value={formData.jellyfin_api_key}
          onChange={v => updateField('jellyfin_api_key', v)}
          type="password"
        />
      </div>
      <TestButton onClick={onTest} loading={loading} result={result} />
    </div>
  )
}
