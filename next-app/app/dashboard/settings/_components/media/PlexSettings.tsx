'use client'

import { Tv } from 'lucide-react'
import { SectionHeader, CheckboxField, InputField, TestButton } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import type { TestResult } from './useMediaSettingsTests'

interface PlexSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  testLoading: boolean
  testResult: TestResult | null
  importLoading: boolean
  importResult: TestResult | null
  onTest: () => void
  onImport: () => void
  readOnly?: boolean
}

export function PlexSettings({
  formData,
  updateField,
  testLoading,
  testResult,
  importLoading,
  importResult,
  onTest,
  onImport,
  readOnly,
}: PlexSettingsProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <SectionHeader icon={Tv} title="Plex" description="Configuration de l'intégration Plex" />
      <div className="mb-6">
        <CheckboxField
          label="Activer l'authentification Plex"
          checked={formData.auth_plex_enabled}
          onChange={v => updateField('auth_plex_enabled', v)}
          description="Permettre aux utilisateurs de se connecter via ce serveur Plex"
          readOnly={readOnly}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL du serveur"
          value={formData.plex_url}
          onChange={v => updateField('plex_url', v)}
          placeholder="http://localhost:32400"
        />
        <InputField
          label="Token (X-Plex-Token)"
          value={formData.plex_token}
          onChange={v => updateField('plex_token', v)}
          type="password"
        />
      </div>
      <div className="flex gap-4">
        <TestButton onClick={onTest} loading={testLoading} result={testResult} />
        <TestButton
          onClick={onImport}
          loading={importLoading}
          result={importResult}
          label="Importer l'historique"
        />
      </div>
    </div>
  )
}
