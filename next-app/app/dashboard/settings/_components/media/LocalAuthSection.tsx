'use client'

import { UserCircle } from 'lucide-react'
import { SectionHeader, CheckboxField } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface LocalAuthSectionProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

export function LocalAuthSection({ formData, updateField, readOnly }: LocalAuthSectionProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader
        icon={UserCircle}
        title="Authentification Locale"
        description="Configuration de l'authentification locale"
      />
      <div className="mb-6">
        <CheckboxField
          label="Activer l'authentification locale"
          checked={formData.auth_local_enabled}
          onChange={v => updateField('auth_local_enabled', v)}
          description="Permettre aux utilisateurs de se connecter avec un compte local"
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}
