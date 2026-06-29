import { Bot } from 'lucide-react'
import { InputField, SectionHeader, TestButton } from '../SharedComponents'
import type { TestResult } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface JellyseerrSectionProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string) => void
  readOnly?: boolean
  onTest: (url: string, apiKey: string) => void
  testLoading: boolean
  testResult: TestResult | null
  onImport: () => void
  importLoading: boolean
  importResult: TestResult | null
  onFix: () => void
  fixLoading: boolean
  fixResult: TestResult | null
}

export function JellyseerrSection({
  formData,
  updateField,
  onTest,
  testLoading,
  testResult,
  onImport,
  importLoading,
  importResult,
  onFix,
  fixLoading,
  fixResult,
}: JellyseerrSectionProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Bot} title="Jellyseerr / Overseerr" description="Gestion des demandes" />
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL"
          value={formData.jellyseerr_url}
          onChange={v => updateField('jellyseerr_url', v)}
          placeholder="http://localhost:5055"
        />
        <InputField
          label="Clé API"
          value={formData.jellyseerr_api_key}
          onChange={v => updateField('jellyseerr_api_key', v)}
          type="password"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <TestButton onClick={() => onTest(formData.jellyseerr_url, formData.jellyseerr_api_key)} loading={testLoading} result={testResult} />
        <TestButton onClick={onImport} loading={importLoading} result={importResult} label="Importer les demandes" />
        <TestButton onClick={onFix} loading={fixLoading} result={fixResult} label="Corriger les titres" />
      </div>
    </div>
  )
}
