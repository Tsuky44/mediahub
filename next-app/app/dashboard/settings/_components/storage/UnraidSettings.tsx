'use client'

import { Server } from 'lucide-react'
import { InputField, SectionHeader, TestButton } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import type { TestResult } from './useStorageTests'

interface UnraidSettingsProps {
  formData: SettingsFormData
  onUpdateField: (field: keyof SettingsFormData, value: string) => void
  onTest: () => void
  loading: boolean
  result: TestResult | null
}

export function UnraidSettings({
  formData,
  onUpdateField,
  onTest,
  loading,
  result,
}: UnraidSettingsProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Server} title="Unraid" description="Intégration Unraid API" />
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL"
          value={formData.unraid_url}
          onChange={v => onUpdateField('unraid_url', v)}
          placeholder="http://192.168.1.100"
        />
        <InputField
          label="Clé API"
          value={formData.unraid_api_key}
          onChange={v => onUpdateField('unraid_api_key', v)}
          type="password"
        />
      </div>
      <TestButton onClick={onTest} loading={loading} result={result} />
    </div>
  )
}
