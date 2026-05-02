'use client'

import { FileQuestion } from 'lucide-react'
import { SectionHeader, CheckboxField } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface RequestSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

export function RequestSettings({ formData, updateField, readOnly }: RequestSettingsProps) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <SectionHeader
        icon={FileQuestion}
        title="Demandes de médias"
        description="Configuration des options de demande"
      />
      <div className="space-y-4">
        <CheckboxField
          label="Forcer la demande de toutes les saisons"
          checked={formData.request_all_seasons_enabled}
          onChange={v => updateField('request_all_seasons_enabled', v)}
          description="Quand activé, les utilisateurs ne peuvent pas choisir de saison spécifique. Toute demande de série ajoutera automatiquement toutes les saisons."
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}
